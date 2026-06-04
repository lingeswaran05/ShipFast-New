package com.shipfast.shipment.entity;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceBreakdown {

    private double baseRate;
    private double tax;
    private double fuelSurcharge;
    private double totalAmount;
}
