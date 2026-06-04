package com.shipfast.operations.dto;

import lombok.Data;

@Data
public class AgentVerificationRequest {
    private Boolean verified;
    private String verifiedBy;
    private String verificationNotes;
    /**
     * Optional explicit status override (e.g., "CANCELLED", "REJECTED", "VERIFIED").
     * When provided and non-blank, takes priority over the 'verified' boolean.
     */
    private String verificationStatus;
}
