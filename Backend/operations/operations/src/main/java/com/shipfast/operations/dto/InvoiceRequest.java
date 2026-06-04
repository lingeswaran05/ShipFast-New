package com.shipfast.operations.dto;

import lombok.Data;

@Data
public class InvoiceRequest {

    private String shipmentTrackingNumber;
    private double baseRate;
    private double taxAndFees;
    private String paymentMode;
}
