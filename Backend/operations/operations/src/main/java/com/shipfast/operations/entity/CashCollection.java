package com.shipfast.operations.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "cash_collections")
public class CashCollection {

    @Id
    private String collectionId;

    private String shipmentId;
    private double codAmount;
    private double upiAmount;
    private double cardAmount;
    private double totalAmount;

    private boolean verified;
    private boolean depositedToBank;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getCollectionId() { return collectionId; }
    public void setCollectionId(String collectionId) { this.collectionId = collectionId; }
    public String getShipmentId() { return shipmentId; }
    public void setShipmentId(String shipmentId) { this.shipmentId = shipmentId; }
    public double getCodAmount() { return codAmount; }
    public void setCodAmount(double codAmount) { this.codAmount = codAmount; }
    public double getUpiAmount() { return upiAmount; }
    public void setUpiAmount(double upiAmount) { this.upiAmount = upiAmount; }
    public double getCardAmount() { return cardAmount; }
    public void setCardAmount(double cardAmount) { this.cardAmount = cardAmount; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public boolean isDepositedToBank() { return depositedToBank; }
    public void setDepositedToBank(boolean depositedToBank) { this.depositedToBank = depositedToBank; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
