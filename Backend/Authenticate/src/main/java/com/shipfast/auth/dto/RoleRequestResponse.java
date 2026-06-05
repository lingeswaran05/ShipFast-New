package com.shipfast.auth.dto;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoleRequestResponse {
    private String id;
    private String requestId;
    private String userId;
    private String email;
    private String name;
    private String currentRole;
    private String requestedRole;
    private String reason;
    private Map<String, Object> agentDetails;
    private Map<String, Object> documents;
    private String status;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
