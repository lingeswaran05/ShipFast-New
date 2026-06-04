package com.shipfast.operations.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AgentProfileResponse {
    private String agentId;
    private String userId;
    private String licenseNumber;
    private String vehicleNumber;
    private String rcBookNumber;
    private String bloodType;
    private Boolean organDonor;
    private String shiftTiming;
    private double successRate;
    private LocalDateTime joinDate;
    private LocalDateTime updatedAt;
    private String verificationStatus;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String verificationNotes;
    private Double averageRating;
    private Long totalRatings;
    private String profileImage;
    private String aadharCopy;
    private String licenseCopy;
    private String rcBookCopy;
    private String availabilityStatus;
    private Long deliveredCount;
    private Long failedCount;
    private Long inTransitCount;
}
