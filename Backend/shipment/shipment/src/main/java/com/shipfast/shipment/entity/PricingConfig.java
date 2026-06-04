package com.shipfast.shipment.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "pricing_configs")
public class PricingConfig {

    @Id
    private String id;

    private double standardRatePerKg;
    private double expressMultiplier;
    private double sameDayMultiplier;
    private double distanceSurcharge;
    private double fuelSurchargePct;
    private double gstPct;
    private double codHandlingFee;
}
