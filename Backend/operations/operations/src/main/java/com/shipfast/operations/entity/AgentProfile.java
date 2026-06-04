package com.shipfast.operations.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "agents")
public class AgentProfile {

    @Id
    private String agentId;

    private String userId;
    private String licenseNumber;
    private String vehicleNumber;
    private String rcBookNumber;
    private String aadharNumber;
    private String bloodType;
    private Boolean organDonor;
    private LocalDateTime joinDate;
    private LocalDateTime updatedAt;
    private String verificationStatus;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String verificationNotes;
    private double successRate;
    private Double averageRating;
    private Long totalRatings;
    private String profileImage;
    private String aadharCopy;
    private String licenseCopy;
    private String rcBookCopy;
    private String shiftTiming;
    private String availabilityStatus;
    private Long deliveredCount;
    private Long failedCount;
    private Long inTransitCount;
}
