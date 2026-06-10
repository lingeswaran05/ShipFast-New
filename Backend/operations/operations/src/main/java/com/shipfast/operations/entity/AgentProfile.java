package com.shipfast.operations.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

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

    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public String getRcBookNumber() { return rcBookNumber; }
    public void setRcBookNumber(String rcBookNumber) { this.rcBookNumber = rcBookNumber; }
    public String getAadharNumber() { return aadharNumber; }
    public void setAadharNumber(String aadharNumber) { this.aadharNumber = aadharNumber; }
    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
    public Boolean getOrganDonor() { return organDonor; }
    public void setOrganDonor(Boolean organDonor) { this.organDonor = organDonor; }
    public LocalDateTime getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDateTime joinDate) { this.joinDate = joinDate; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }
    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }
    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }
    public double getSuccessRate() { return successRate; }
    public void setSuccessRate(double successRate) { this.successRate = successRate; }
    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
    public Long getTotalRatings() { return totalRatings; }
    public void setTotalRatings(Long totalRatings) { this.totalRatings = totalRatings; }
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
    public String getAadharCopy() { return aadharCopy; }
    public void setAadharCopy(String aadharCopy) { this.aadharCopy = aadharCopy; }
    public String getLicenseCopy() { return licenseCopy; }
    public void setLicenseCopy(String licenseCopy) { this.licenseCopy = licenseCopy; }
    public String getRcBookCopy() { return rcBookCopy; }
    public void setRcBookCopy(String rcBookCopy) { this.rcBookCopy = rcBookCopy; }
    public String getShiftTiming() { return shiftTiming; }
    public void setShiftTiming(String shiftTiming) { this.shiftTiming = shiftTiming; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public Long getDeliveredCount() { return deliveredCount; }
    public void setDeliveredCount(Long deliveredCount) { this.deliveredCount = deliveredCount; }
    public Long getFailedCount() { return failedCount; }
    public void setFailedCount(Long failedCount) { this.failedCount = failedCount; }
    public Long getInTransitCount() { return inTransitCount; }
    public void setInTransitCount(Long inTransitCount) { this.inTransitCount = inTransitCount; }
}
