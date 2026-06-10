package com.shipfast.operations.dto;

import java.time.LocalDateTime;

public class InvoiceResponse {

    private String invoiceId;
    private String shipmentTrackingNumber;
    private double totalAmount;
    private String paymentStatus;
    private LocalDateTime createdAt;

    public String getInvoiceId() { return invoiceId; }
    public void setInvoiceId(String invoiceId) { this.invoiceId = invoiceId; }
    public String getShipmentTrackingNumber() { return shipmentTrackingNumber; }
    public void setShipmentTrackingNumber(String shipmentTrackingNumber) { this.shipmentTrackingNumber = shipmentTrackingNumber; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
