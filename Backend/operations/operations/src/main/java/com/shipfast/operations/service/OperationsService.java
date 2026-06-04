package com.shipfast.operations.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.shipfast.operations.dto.AgentProfileRequest;
import com.shipfast.operations.dto.AgentProfileResponse;
import com.shipfast.operations.dto.AgentRatingRequest;
import com.shipfast.operations.dto.AgentRequest;
import com.shipfast.operations.dto.AgentResponse;
import com.shipfast.operations.dto.AgentVerificationRequest;
import com.shipfast.operations.dto.CashCollectionRequest;
import com.shipfast.operations.dto.CashCollectionResponse;
import com.shipfast.operations.dto.InvoiceRequest;
import com.shipfast.operations.dto.InvoiceResponse;
import com.shipfast.operations.dto.RunSheetRequest;
import com.shipfast.operations.dto.RunSheetResponse;
import com.shipfast.operations.dto.ScanRequest;
import com.shipfast.operations.entity.AgentProfile;
import com.shipfast.operations.entity.CashCollection;
import com.shipfast.operations.entity.DeliveryScan;
import com.shipfast.operations.entity.Invoice;
import com.shipfast.operations.entity.RunSheet;
import com.shipfast.operations.repository.AgentRepository;
import com.shipfast.operations.repository.CashCollectionRepository;
import com.shipfast.operations.repository.DeliveryScanRepository;
import com.shipfast.operations.repository.InvoiceRepository;
import com.shipfast.operations.repository.RunSheetRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OperationsService {

    private final AgentRepository agentRepo;
    private final RunSheetRepository runSheetRepo;
    private final DeliveryScanRepository scanRepo;
    private final CashCollectionRepository cashRepo;
    private final InvoiceRepository invoiceRepo;
    private final RestTemplate restTemplate;

    @Value("${shipment.service.url}")
    private String shipmentServiceUrl;



    public AgentResponse createAgent(AgentRequest request) {

        AgentProfile agent = AgentProfile.builder()
                .agentId("AG-" + UUID.randomUUID().toString().substring(0,6))
                .userId(request.getUserId())
                .licenseNumber(request.getLicenseNumber())
                .vehicleNumber(request.getVehicleNumber())
                .rcBookNumber(request.getRcBookNumber())
                .aadharNumber(request.getAadharNumber())
                .bloodType(request.getBloodType())
                .organDonor(Boolean.FALSE)
                .shiftTiming(request.getShiftTiming())
                .joinDate(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .verificationStatus("PENDING")
                .successRate(100.0)
                .averageRating(0.0)
                .totalRatings(0L)
                .availabilityStatus("OFFLINE")
                .deliveredCount(0L)
                .failedCount(0L)
                .inTransitCount(0L)
                .build();

        agentRepo.save(Objects.requireNonNull(agent));

        return mapToAgentResponse(agent);
    }

    public List<AgentResponse> getAllAgents() {

        return agentRepo.findAll()
                .stream()
            .filter(this::isEligibleForAssignment)
                .map(this::mapToAgentResponse)
                .toList();
    }

        private boolean isEligibleForAssignment(AgentProfile agent) {
        if (agent == null) return false;
        String verification = String.valueOf(agent.getVerificationStatus() == null ? "" : agent.getVerificationStatus()).trim().toUpperCase();
        if ("REJECTED".equals(verification)) return false;

        String availability = String.valueOf(agent.getAvailabilityStatus() == null ? "" : agent.getAvailabilityStatus()).trim().toUpperCase();
        return "AVAILABLE".equals(availability)
            || "ACTIVE".equals(availability)
            || "READY".equals(availability)
            || "IN_TRANSIT".equals(availability)
            || "ONLINE".equals(availability)
            || "LOGGED_IN".equals(availability)
            || "LOGGED-IN".equals(availability);
        }

    private AgentResponse mapToAgentResponse(AgentProfile agent) {
        return AgentResponse.builder()
                .agentId(agent.getAgentId())
                .userId(agent.getUserId())
            .availabilityStatus(agent.getAvailabilityStatus() != null ? agent.getAvailabilityStatus().toUpperCase() : "OFFLINE")
            .verificationStatus(agent.getVerificationStatus() != null ? agent.getVerificationStatus().toUpperCase() : "PENDING")
                .shiftTiming(agent.getShiftTiming())
                .successRate(agent.getSuccessRate())
                .averageRating(agent.getAverageRating())
                .totalRatings(agent.getTotalRatings())
                .joinDate(agent.getJoinDate())
                .build();
    }

    public AgentProfileResponse getAgentProfileByUserId(String userId) {
        AgentProfile profile = agentRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Agent profile not found"));
        return mapToAgentProfileResponse(profile);
    }

    public AgentProfileResponse getAgentProfileByIdentifier(String agentIdentifier) {
        AgentProfile profile = resolveAgentProfile(agentIdentifier);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent profile not found");
        }
        return mapToAgentProfileResponse(profile);
    }

    /**
     * Returns the current agent request status for the given userId from the DB.
     * Possible values: "PENDING", "VERIFIED", "REJECTED", "CANCELLED", "NONE" (no profile found).
     */
    public java.util.Map<String, String> checkAgentRequestStatus(String userId) {
        return agentRepo.findByUserId(userId)
                .map(profile -> {
                    String status = profile.getVerificationStatus();
                    String normalized = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : "PENDING";
                    boolean hasPending = "PENDING".equals(normalized) || "PENDING_VERIFICATION".equals(normalized);
                    return java.util.Map.of("status", normalized, "hasPending", hasPending ? "true" : "false");
                })
                .orElse(java.util.Map.of("status", "NONE", "hasPending", "false"));
    }

    public AgentProfileResponse upsertAgentProfile(String userId, AgentProfileRequest request) {
        AgentProfile existing = agentRepo.findByUserId(userId).orElse(null);

        // Block re-submission if there is already a PENDING request in DB
        if (existing != null) {
            String currentStatus = existing.getVerificationStatus();
            boolean isCurrentlyPending = currentStatus != null && "PENDING".equalsIgnoreCase(currentStatus.trim());
            // Allow upsert only if request contains non-agent-request fields (e.g., availabilityStatus update by an agent)
            boolean isAgentRequestPayload = request.getLicenseNumber() != null
                    || request.getAadharNumber() != null
                    || request.getVehicleNumber() != null
                    || request.getRcBookNumber() != null
                    || request.getProfileImage() != null
                    || request.getAadharCopy() != null
                    || request.getLicenseCopy() != null
                    || request.getRcBookCopy() != null;
            // A pending agent request can be edited by the same user/admin flow.
            // Keep the existing profile and merge the latest documents/details below.
        }

        AgentProfile profile = existing != null ? existing : AgentProfile.builder()
                        .agentId("AG-" + UUID.randomUUID().toString().substring(0, 6))
                        .userId(userId)
                        .joinDate(LocalDateTime.now())
                        .verificationStatus("PENDING")
                        .successRate(100.0)
                        .averageRating(0.0)
                        .totalRatings(0L)
                        .availabilityStatus("OFFLINE")
                        .deliveredCount(0L)
                        .failedCount(0L)
                        .inTransitCount(0L)
                        .build();

        if (request.getLicenseNumber() != null) profile.setLicenseNumber(request.getLicenseNumber());
        if (request.getAadharNumber() != null) profile.setAadharNumber(request.getAadharNumber());
        if (request.getVehicleNumber() != null) profile.setVehicleNumber(request.getVehicleNumber());
        if (request.getRcBookNumber() != null) profile.setRcBookNumber(request.getRcBookNumber());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getOrganDonor() != null) profile.setOrganDonor(request.getOrganDonor());
        if (request.getShiftTiming() != null) profile.setShiftTiming(request.getShiftTiming());
        if (request.getProfileImage() != null) profile.setProfileImage(request.getProfileImage());
        if (request.getAadharCopy() != null) profile.setAadharCopy(request.getAadharCopy());
        if (request.getLicenseCopy() != null) profile.setLicenseCopy(request.getLicenseCopy());
        if (request.getRcBookCopy() != null) profile.setRcBookCopy(request.getRcBookCopy());
        if (request.getVerificationStatus() != null) profile.setVerificationStatus(request.getVerificationStatus().toUpperCase());
        if (request.getVerifiedBy() != null) profile.setVerifiedBy(request.getVerifiedBy());
        if (request.getVerificationNotes() != null) profile.setVerificationNotes(request.getVerificationNotes());
        if (request.getAvailabilityStatus() != null) profile.setAvailabilityStatus(request.getAvailabilityStatus().toUpperCase());
        if (request.getDeliveredCount() != null) profile.setDeliveredCount(Math.max(0L, request.getDeliveredCount()));
        if (request.getFailedCount() != null) profile.setFailedCount(Math.max(0L, request.getFailedCount()));
        if (request.getInTransitCount() != null) profile.setInTransitCount(Math.max(0L, request.getInTransitCount()));
        if (profile.getAverageRating() == null) profile.setAverageRating(0.0);
        if (profile.getTotalRatings() == null) profile.setTotalRatings(0L);
        if (profile.getAvailabilityStatus() == null || profile.getAvailabilityStatus().isBlank()) profile.setAvailabilityStatus("OFFLINE");
        if (profile.getDeliveredCount() == null) profile.setDeliveredCount(0L);
        if (profile.getFailedCount() == null) profile.setFailedCount(0L);
        if (profile.getInTransitCount() == null) profile.setInTransitCount(0L);
        profile.setUpdatedAt(LocalDateTime.now());
        if ("VERIFIED".equalsIgnoreCase(profile.getVerificationStatus())) {
            profile.setVerifiedAt(LocalDateTime.now());
        }

        agentRepo.save(Objects.requireNonNull(profile));
        return mapToAgentProfileResponse(profile);
    }

    public AgentProfileResponse verifyAgentProfile(String userId, AgentVerificationRequest request) {
        AgentProfile profile = agentRepo.findByUserId(userId)
                .orElseGet(() -> AgentProfile.builder()
                        .agentId("AG-" + UUID.randomUUID().toString().substring(0, 6))
                        .userId(userId)
                        .joinDate(LocalDateTime.now())
                        .verificationStatus("PENDING")
                        .successRate(100.0)
                        .averageRating(0.0)
                        .totalRatings(0L)
                        .availabilityStatus("OFFLINE")
                        .deliveredCount(0L)
                        .failedCount(0L)
                        .inTransitCount(0L)
                        .build());

        // If an explicit status override is supplied (e.g., "CANCELLED"), use it directly.
        String explicitStatus = request != null && request.getVerificationStatus() != null
                ? request.getVerificationStatus().trim().toUpperCase()
                : null;
        if (explicitStatus != null && !explicitStatus.isBlank()) {
            profile.setVerificationStatus(explicitStatus);
        } else {
            boolean verified = request != null && request.getVerified() != null && request.getVerified();
            profile.setVerificationStatus(verified ? "VERIFIED" : "REJECTED");
        }
        profile.setVerifiedBy(request != null ? request.getVerifiedBy() : null);
        profile.setVerificationNotes(request != null ? request.getVerificationNotes() : null);
        profile.setUpdatedAt(LocalDateTime.now());
        profile.setVerifiedAt(LocalDateTime.now());
        if (profile.getAverageRating() == null) profile.setAverageRating(0.0);
        if (profile.getTotalRatings() == null) profile.setTotalRatings(0L);
        if (profile.getAvailabilityStatus() == null || profile.getAvailabilityStatus().isBlank()) profile.setAvailabilityStatus("OFFLINE");
        if (profile.getDeliveredCount() == null) profile.setDeliveredCount(0L);
        if (profile.getFailedCount() == null) profile.setFailedCount(0L);
        if (profile.getInTransitCount() == null) profile.setInTransitCount(0L);

        agentRepo.save(Objects.requireNonNull(profile));
        return mapToAgentProfileResponse(profile);
    }

    public void deleteAgentProfile(String userIdOrAgentId) {
        if (userIdOrAgentId == null || userIdOrAgentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent user id is required");
        }

        boolean removed = false;
        AgentProfile byUserId = agentRepo.findByUserId(userIdOrAgentId).orElse(null);
        if (byUserId != null) {
            agentRepo.delete(byUserId);
            removed = true;
        }

        if (agentRepo.existsById(userIdOrAgentId)) {
            agentRepo.deleteById(userIdOrAgentId);
            removed = true;
        }

        if (!removed) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent profile not found");
        }
    }

    public AgentProfileResponse recordAgentRating(String agentIdentifier, AgentRatingRequest request) {
        if (request == null || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
        }

        AgentProfile profile = resolveAgentProfile(agentIdentifier);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent profile not found");
        }

        Double averageRating = profile.getAverageRating();
        Long totalRatings = profile.getTotalRatings();
        double currentAverage = averageRating != null ? averageRating.doubleValue() : 0.0;
        long currentCount = totalRatings != null ? totalRatings.longValue() : 0L;
        long nextCount = currentCount + 1L;
        double nextAverage = ((currentAverage * currentCount) + request.getRating()) / nextCount;

        profile.setAverageRating(Math.round(nextAverage * 100.0) / 100.0);
        profile.setTotalRatings(nextCount);
        profile.setUpdatedAt(LocalDateTime.now());
        agentRepo.save(Objects.requireNonNull(profile));
        return mapToAgentProfileResponse(profile);
    }

    private AgentProfileResponse mapToAgentProfileResponse(AgentProfile profile) {
        return AgentProfileResponse.builder()
                .agentId(profile.getAgentId())
                .userId(profile.getUserId())
                .licenseNumber(profile.getLicenseNumber())
                .vehicleNumber(profile.getVehicleNumber())
                .rcBookNumber(profile.getRcBookNumber())
                .bloodType(profile.getBloodType())
                .organDonor(profile.getOrganDonor())
                .shiftTiming(profile.getShiftTiming())
                .successRate(profile.getSuccessRate())
                .joinDate(profile.getJoinDate())
                .updatedAt(profile.getUpdatedAt())
                .verificationStatus(profile.getVerificationStatus())
                .verifiedBy(profile.getVerifiedBy())
                .verifiedAt(profile.getVerifiedAt())
                .verificationNotes(profile.getVerificationNotes())
                .averageRating(profile.getAverageRating() != null ? profile.getAverageRating().doubleValue() : 0.0)
                .totalRatings(profile.getTotalRatings() != null ? profile.getTotalRatings().longValue() : 0L)
                .profileImage(profile.getProfileImage())
                .aadharCopy(profile.getAadharCopy())
                .licenseCopy(profile.getLicenseCopy())
                .rcBookCopy(profile.getRcBookCopy())
                .availabilityStatus(profile.getAvailabilityStatus() != null ? profile.getAvailabilityStatus() : "OFFLINE")
                .deliveredCount(profile.getDeliveredCount() != null ? profile.getDeliveredCount() : 0L)
                .failedCount(profile.getFailedCount() != null ? profile.getFailedCount() : 0L)
                .inTransitCount(profile.getInTransitCount() != null ? profile.getInTransitCount() : 0L)
                .build();
    }

    private AgentProfile resolveAgentProfile(String agentIdentifier) {
        if (agentIdentifier == null || agentIdentifier.isBlank()) return null;
        return agentRepo.findById(agentIdentifier)
                .or(() -> agentRepo.findByUserId(agentIdentifier))
                .orElse(null);
    }

    public RunSheetResponse createRunSheet(RunSheetRequest request) {

        RunSheet runSheet = RunSheet.builder()
                .runSheetId("RS-" + UUID.randomUUID().toString().substring(0,6))
                .agentId(request.getAgentId())
                .hubId(request.getHubId())
                .date(LocalDate.now())
                .shipmentIds(request.getShipmentTrackingNumbers())
                .build();

        runSheetRepo.save(Objects.requireNonNull(runSheet));
        if (request.getShipmentTrackingNumbers() != null) {
            for (String shipmentId : request.getShipmentTrackingNumbers()) {
                try {
                    restTemplate.postForObject(
                            shipmentServiceUrl + "/api/v1/shipments/" + shipmentId + "/assign",
                            java.util.Map.of("agentId", request.getAgentId()),
                            Object.class
                    );
                } catch (RestClientException ignored) {
                    // keep run-sheet creation non-blocking even if assignment API fails for some ids
                }
            }
        }

        return RunSheetResponse.builder()
                .runSheetId(runSheet.getRunSheetId())
                .agentId(runSheet.getAgentId())
                .hubId(runSheet.getHubId())
                .date(runSheet.getDate())
                .shipmentTrackingNumbers(runSheet.getShipmentIds())
                .build();
    }

    public List<RunSheetResponse> getRunSheetsByAgent(String agentId) {

        return runSheetRepo.findByAgentId(agentId)
                .stream()
                .map(rs -> RunSheetResponse.builder()
                        .runSheetId(rs.getRunSheetId())
                        .agentId(rs.getAgentId())
                        .hubId(rs.getHubId())
                        .date(rs.getDate())
                        .shipmentTrackingNumbers(rs.getShipmentIds())
                        .build())
                .toList();
    }

    public void scanShipment(ScanRequest request) {

        try {
            restTemplate.patchForObject(
                    shipmentServiceUrl + "/api/v1/shipments/" +
                            request.getShipmentTrackingNumber() +
                            "/status",
                    java.util.Map.of("status", request.getStatus(), "remarks", "Updated from scan operation"),
                    Object.class
            );
        } catch (RestClientException ignored) {
            // scan should still be recorded even if status call fails
        }

        DeliveryScan scan = DeliveryScan.builder()
                .scanId(UUID.randomUUID().toString())
                .shipmentId(request.getShipmentTrackingNumber())
                .agentId(request.getAgentId())
                .status(request.getStatus())
                .scannedAt(LocalDateTime.now())
                .remarks("Scanned by agent")
                .build();

        scanRepo.save(Objects.requireNonNull(scan));
    }



    public CashCollectionResponse recordCash(CashCollectionRequest request) {

        double total = request.getCodAmount()
                + request.getUpiAmount()
                + request.getCardAmount();

        CashCollection collection = CashCollection.builder()
                .collectionId("CC-" + UUID.randomUUID().toString().substring(0,6))
                .shipmentId(request.getShipmentTrackingNumber())
                .codAmount(request.getCodAmount())
                .upiAmount(request.getUpiAmount())
                .cardAmount(request.getCardAmount())
                .totalAmount(total)
                .verified(false)
                .depositedToBank(false)
                .timestamp(LocalDateTime.now())
                .build();

        cashRepo.save(Objects.requireNonNull(collection));

        return mapToCashResponse(collection);
    }

    public CashCollectionResponse verifyCash(String id) {

        CashCollection collection = cashRepo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Collection not found"));

        collection.setVerified(true);
        cashRepo.save(Objects.requireNonNull(collection));

        return mapToCashResponse(collection);
    }

    private CashCollectionResponse mapToCashResponse(CashCollection c) {
        return CashCollectionResponse.builder()
                .collectionId(c.getCollectionId())
                                .shipmentTrackingNumber(c.getShipmentId())
                .totalAmount(c.getTotalAmount())
                .verified(c.isVerified())
                .depositedToBank(c.isDepositedToBank())
                .timestamp(c.getTimestamp())
                .build();
    }



    public InvoiceResponse generateInvoice(InvoiceRequest request) {

        double total = request.getBaseRate() + request.getTaxAndFees();

        Invoice invoice = Invoice.builder()
                .invoiceId("INV-" + UUID.randomUUID().toString().substring(0,6))
                .shipmentTrackingNumber(request.getShipmentTrackingNumber())
                .baseRate(request.getBaseRate())
                .taxAndFees(request.getTaxAndFees())
                .totalAmount(total)
                .paymentMode(request.getPaymentMode())
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .build();

        invoiceRepo.save(Objects.requireNonNull(invoice));

        return InvoiceResponse.builder()
                .invoiceId(invoice.getInvoiceId())
                .shipmentTrackingNumber(invoice.getShipmentTrackingNumber())
                .totalAmount(invoice.getTotalAmount())
                .paymentStatus(invoice.getPaymentStatus())
                .createdAt(invoice.getCreatedAt())
                .build();
    }
}
