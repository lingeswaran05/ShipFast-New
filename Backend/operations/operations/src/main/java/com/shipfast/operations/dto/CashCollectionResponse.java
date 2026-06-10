package com.shipfast.operations.dto;

import java.time.LocalDateTime;

public class CashCollectionResponse {

    private String collectionId;
    private String shipmentTrackingNumber;
    private double totalAmount;
    private boolean verified;
    private boolean depositedToBank;
    private LocalDateTime timestamp;

    public String getCollectionId() { return collectionId; }
    public void setCollectionId(String collectionId) { this.collectionId = collectionId; }
    public String getShipmentTrackingNumber() { return shipmentTrackingNumber; }
    public void setShipmentTrackingNumber(String shipmentTrackingNumber) { this.shipmentTrackingNumber = shipmentTrackingNumber; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public boolean isDepositedToBank() { return depositedToBank; }
    public void setDepositedToBank(boolean depositedToBank) { this.depositedToBank = depositedToBank; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
