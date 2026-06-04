package com.shipfast.shipment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RateCalculationResponse {
    private double baseRate;
    private double fuelSurcharge;
    private double gst;
    private double totalCost;
    private int estimatedDeliveryDays;
}
