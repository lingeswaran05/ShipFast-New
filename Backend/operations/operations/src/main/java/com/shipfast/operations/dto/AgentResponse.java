package com.shipfast.operations.dto;

import java.time.LocalDateTime;

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

    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getShiftTiming() { return shiftTiming; }
    public void setShiftTiming(String shiftTiming) { this.shiftTiming = shiftTiming; }
    public double getSuccessRate() { return successRate; }
    public void setSuccessRate(double successRate) { this.successRate = successRate; }
    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
    public Long getTotalRatings() { return totalRatings; }
    public void setTotalRatings(Long totalRatings) { this.totalRatings = totalRatings; }
    public LocalDateTime getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDateTime joinDate) { this.joinDate = joinDate; }
}
