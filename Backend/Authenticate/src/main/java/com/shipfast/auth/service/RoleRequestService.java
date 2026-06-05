package com.shipfast.auth.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shipfast.auth.dto.RoleRequestCreateRequest;
import com.shipfast.auth.dto.RoleRequestResponse;
import com.shipfast.auth.entity.RoleRequest;
import com.shipfast.auth.entity.UserAuth;
import com.shipfast.auth.entity.UserRole;
import com.shipfast.auth.repository.RoleRequestRepository;
import com.shipfast.auth.repository.UserAuthRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoleRequestService {

    private static final Set<String> OPEN_STATUSES = Set.of("PENDING", "PENDING_VERIFICATION");

    private final RoleRequestRepository roleRequestRepository;
    private final UserAuthRepository userAuthRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public RoleRequestResponse createRequest(RoleRequestCreateRequest request, String requesterEmail) {
        UserAuth requester = userAuthRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

        UserAuth targetUser = resolveTargetUser(request, requester);
        if (targetUser.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin accounts cannot submit role upgrade requests");
        }

        roleRequestRepository.findFirstByUserIdAndStatusInOrderByCreatedAtDesc(targetUser.getUserId(), OPEN_STATUSES)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a pending request");
                });

        RoleRequest entity = new RoleRequest();
        entity.setRequestId("rr-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        entity.setUserId(targetUser.getUserId());
        entity.setEmail(targetUser.getEmail());
        entity.setName(hasText(request.getName()) ? request.getName().trim() : targetUser.getEmail());
        entity.setCurrentRole(targetUser.getRole().name());
        entity.setRequestedRole(normalizeRequestedRole(request.getRequestedRole()));
        entity.setReason(trimToNull(request.getReason()));
        entity.setAgentDetailsJson(writeJson(request.getAgentDetails()));
        entity.setDocumentsJson(writeJson(request.getDocuments()));
        entity.setStatus("PENDING");

        return toResponse(roleRequestRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<RoleRequestResponse> getPendingRequests() {
        return roleRequestRepository.findByStatusInOrderByCreatedAtDesc(OPEN_STATUSES)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RoleRequestResponse approveRequest(String requestId, String reviewerEmail) {
        RoleRequest request = getById(requestId);
        request.setStatus("APPROVED");
        request.setReviewedBy(reviewerEmail);
        request.setReviewedAt(java.time.LocalDateTime.now());

        userAuthRepository.findById(request.getUserId()).ifPresent(user -> {
            user.setRole(UserRole.valueOf(request.getRequestedRole()));
            userAuthRepository.save(user);
        });

        return toResponse(roleRequestRepository.save(request));
    }

    @Transactional
    public RoleRequestResponse rejectRequest(String requestId, String reviewerEmail) {
        RoleRequest request = getById(requestId);
        request.setStatus("REJECTED");
        request.setReviewedBy(reviewerEmail);
        request.setReviewedAt(java.time.LocalDateTime.now());
        return toResponse(roleRequestRepository.save(request));
    }

    @Transactional
    public RoleRequestResponse cancelRequest(String requestId, String requesterEmail, boolean adminOverride) {
        RoleRequest request = getById(requestId);
        if (!adminOverride && !request.getEmail().equalsIgnoreCase(requesterEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only cancel your own request");
        }
        request.setStatus("CANCELLED");
        request.setReviewedBy(requesterEmail);
        request.setReviewedAt(java.time.LocalDateTime.now());
        return toResponse(roleRequestRepository.save(request));
    }

    private RoleRequest getById(String requestId) {
        return roleRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role request not found"));
    }

    private UserAuth resolveTargetUser(RoleRequestCreateRequest request, UserAuth requester) {
        if (hasText(request.getUserId())) {
            return userAuthRepository.findByUserId(request.getUserId().trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }
        if (hasText(request.getEmail())) {
            return userAuthRepository.findByEmail(request.getEmail().trim().toLowerCase())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }
        return requester;
    }

    private String normalizeRequestedRole(String role) {
        String normalized = String.valueOf(role == null ? "AGENT" : role).trim().toUpperCase();
        if (!Set.of("AGENT", "CUSTOMER", "ADMIN").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported role request");
        }
        return normalized;
    }

    private RoleRequestResponse toResponse(RoleRequest request) {
        return RoleRequestResponse.builder()
                .id(request.getRequestId())
                .requestId(request.getRequestId())
                .userId(request.getUserId())
                .email(request.getEmail())
                .name(request.getName())
                .currentRole(request.getCurrentRole())
                .requestedRole(request.getRequestedRole())
                .reason(request.getReason())
                .agentDetails(readJsonMap(request.getAgentDetailsJson()))
                .documents(readJsonMap(request.getDocumentsJson()))
                .status(request.getStatus())
                .reviewedBy(request.getReviewedBy())
                .reviewedAt(request.getReviewedAt())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request payload");
        }
    }

    private Map<String, Object> readJsonMap(String value) {
        if (!hasText(value)) return Map.of();
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }
}
