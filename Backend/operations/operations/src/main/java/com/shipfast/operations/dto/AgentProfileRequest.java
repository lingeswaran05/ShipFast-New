package com.shipfast.operations.dto;

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

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
    public String getAadharNumber() { return aadharNumber; }
    public void setAadharNumber(String aadharNumber) { this.aadharNumber = aadharNumber; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public String getRcBookNumber() { return rcBookNumber; }
    public void setRcBookNumber(String rcBookNumber) { this.rcBookNumber = rcBookNumber; }
    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
    public Boolean getOrganDonor() { return organDonor; }
    public void setOrganDonor(Boolean organDonor) { this.organDonor = organDonor; }
    public String getShiftTiming() { return shiftTiming; }
    public void setShiftTiming(String shiftTiming) { this.shiftTiming = shiftTiming; }
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
    public String getAadharCopy() { return aadharCopy; }
    public void setAadharCopy(String aadharCopy) { this.aadharCopy = aadharCopy; }
    public String getLicenseCopy() { return licenseCopy; }
    public void setLicenseCopy(String licenseCopy) { this.licenseCopy = licenseCopy; }
    public String getRcBookCopy() { return rcBookCopy; }
    public void setRcBookCopy(String rcBookCopy) { this.rcBookCopy = rcBookCopy; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }
    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public Long getDeliveredCount() { return deliveredCount; }
    public void setDeliveredCount(Long deliveredCount) { this.deliveredCount = deliveredCount; }
    public Long getFailedCount() { return failedCount; }
    public void setFailedCount(Long failedCount) { this.failedCount = failedCount; }
    public Long getInTransitCount() { return inTransitCount; }
    public void setInTransitCount(Long inTransitCount) { this.inTransitCount = inTransitCount; }
}
