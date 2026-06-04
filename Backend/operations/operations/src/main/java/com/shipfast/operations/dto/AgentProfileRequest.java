package com.shipfast.operations.dto;

import lombok.Data;

@Data
public class AgentProfileRequest {
    private String licenseNumber;
    private String aadharNumber;
    private String vehicleNumber;
    private String rcBookNumber;
    private String bloodType;
    private Boolean organDonor;
    private String shiftTiming;
    private String profileImage;
    private String aadharCopy;
    private String licenseCopy;
    private String rcBookCopy;
    private String verificationStatus;
    private String verifiedBy;
    private String verificationNotes;
    private String availabilityStatus;
    private Long deliveredCount;
    private Long failedCount;
    private Long inTransitCount;
}
