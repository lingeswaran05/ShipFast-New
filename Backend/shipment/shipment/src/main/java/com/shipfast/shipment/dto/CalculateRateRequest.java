package com.shipfast.shipment.dto;

import lombok.Data;

@Data
public class CalculateRateRequest {
    private double weight;
    private String serviceType;
    private String originPincode;
    private String destinationPincode;
}
