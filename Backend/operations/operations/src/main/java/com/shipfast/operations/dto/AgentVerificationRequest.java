package com.shipfast.operations.dto;

public class AgentVerificationRequest {
    private Boolean verified;
    private String verifiedBy;
    private String verificationNotes;
    /**
     * Optional explicit status override (e.g., "CANCELLED", "REJECTED", "VERIFIED").
     * When provided and non-blank, takes priority over the 'verified' boolean.
     */
    private String verificationStatus;

    public Boolean getVerified() { return verified; }
    public void setVerified(Boolean verified) { this.verified = verified; }
    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }
    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
}
