package com.shipfast.operations.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AgentResponse {

    private String agentId;
    private String userId;
    private String availabilityStatus;
    private String verificationStatus;
    private String shiftTiming;
    private double successRate;
    private Double averageRating;
    private Long totalRatings;
    private LocalDateTime joinDate;
}
