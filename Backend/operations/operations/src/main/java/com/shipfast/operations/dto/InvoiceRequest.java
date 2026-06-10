package com.shipfast.operations.dto;

public class InvoiceRequest {

    private String shipmentTrackingNumber;
    private double baseRate;
    private double taxAndFees;
    private String paymentMode;

    public String getShipmentTrackingNumber() {
        return shipmentTrackingNumber;
    }

    public void setShipmentTrackingNumber(String shipmentTrackingNumber) {
        this.shipmentTrackingNumber = shipmentTrackingNumber;
    }

    public double getBaseRate() {
        return baseRate;
    }

    public void setBaseRate(double baseRate) {
        this.baseRate = baseRate;
    }

    public double getTaxAndFees() {
        return taxAndFees;
    }

    public void setTaxAndFees(double taxAndFees) {
        this.taxAndFees = taxAndFees;
    }

    public String getPaymentMode() {
        return paymentMode;
    }

    public void setPaymentMode(String paymentMode) {
        this.paymentMode = paymentMode;
    }
}
