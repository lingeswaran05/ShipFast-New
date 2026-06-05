package com.shipfast.auth.dto;

import java.util.Map;

import lombok.Data;

@Data
public class RoleRequestCreateRequest {
    private String userId;
    private String email;
    private String name;
    private String requestedRole;
    private String reason;
    private Map<String, Object> agentDetails;
    private Map<String, Object> documents;
}
