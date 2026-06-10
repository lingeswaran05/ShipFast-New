package com.shipfast.operations.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "invoices")
public class Invoice {

    @Id
    private String invoiceId;

    private String shipmentTrackingNumber;
    private double baseRate;
    private double taxAndFees;
    private double totalAmount;

    private String paymentMode;
    private String paymentStatus;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getInvoiceId() { return invoiceId; }
    public void setInvoiceId(String invoiceId) { this.invoiceId = invoiceId; }
    public String getShipmentTrackingNumber() { return shipmentTrackingNumber; }
    public void setShipmentTrackingNumber(String shipmentTrackingNumber) { this.shipmentTrackingNumber = shipmentTrackingNumber; }
    public double getBaseRate() { return baseRate; }
    public void setBaseRate(double baseRate) { this.baseRate = baseRate; }
    public double getTaxAndFees() { return taxAndFees; }
    public void setTaxAndFees(double taxAndFees) { this.taxAndFees = taxAndFees; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
