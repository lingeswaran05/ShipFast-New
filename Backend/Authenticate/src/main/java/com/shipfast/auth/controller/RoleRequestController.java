package com.shipfast.auth.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.shipfast.auth.dto.ApiResponse;
import com.shipfast.auth.dto.RoleRequestCreateRequest;
import com.shipfast.auth.dto.RoleRequestResponse;
import com.shipfast.auth.service.RoleRequestService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping({"/api/v1/roles", "/api/roles"})
@RequiredArgsConstructor
public class RoleRequestController {

    private final RoleRequestService roleRequestService;

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<RoleRequestResponse>> createRequest(
            Authentication authentication,
            @RequestBody RoleRequestCreateRequest request) {
        RoleRequestResponse response = roleRequestService.createRequest(request, authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Role request created successfully", response));
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<ApiResponse<List<RoleRequestResponse>>> getPendingRequests() {
        List<RoleRequestResponse> response = roleRequestService.getPendingRequests();
        return ResponseEntity.ok(new ApiResponse<>(true, "Pending role requests fetched successfully", response));
    }

    @GetMapping("/requests/status")
    public ResponseEntity<ApiResponse<Map<String, String>>> getMyRequestStatus(Authentication authentication) {
        Map<String, String> response = roleRequestService.getMyRequestStatus(authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Role request status fetched successfully", response));
    }

    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<ApiResponse<RoleRequestResponse>> approveRequest(
            Authentication authentication,
            @PathVariable String requestId) {
        RoleRequestResponse response = roleRequestService.approveRequest(requestId, authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Role request approved successfully", response));
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<ApiResponse<RoleRequestResponse>> rejectRequest(
            Authentication authentication,
            @PathVariable String requestId) {
        RoleRequestResponse response = roleRequestService.rejectRequest(requestId, authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Role request rejected successfully", response));
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<ApiResponse<RoleRequestResponse>> cancelRequest(
            Authentication authentication,
            @PathVariable String requestId) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        RoleRequestResponse response = roleRequestService.cancelRequest(requestId, authentication.getName(), isAdmin);
        return ResponseEntity.ok(new ApiResponse<>(true, "Role request cancelled successfully", response));
    }
}
