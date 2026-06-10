package com.shipfast.operations.dto;

public class CashCollectionRequest {

    private String shipmentTrackingNumber;

    private double codAmount;
    private double upiAmount;
    private double cardAmount;

    public String getShipmentTrackingNumber() {
        return shipmentTrackingNumber;
    }

    public void setShipmentTrackingNumber(String shipmentTrackingNumber) {
        this.shipmentTrackingNumber = shipmentTrackingNumber;
    }

    public double getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(double codAmount) {
        this.codAmount = codAmount;
    }

    public double getUpiAmount() {
        return upiAmount;
    }

    public void setUpiAmount(double upiAmount) {
        this.upiAmount = upiAmount;
    }

    public double getCardAmount() {
        return cardAmount;
    }

    public void setCardAmount(double cardAmount) {
        this.cardAmount = cardAmount;
    }
}
