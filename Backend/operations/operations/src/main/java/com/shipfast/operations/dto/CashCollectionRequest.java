package com.shipfast.operations.dto;

import lombok.Data;

@Data
public class CashCollectionRequest {

    private String shipmentTrackingNumber;

    private double codAmount;
    private double upiAmount;
    private double cardAmount;
}
