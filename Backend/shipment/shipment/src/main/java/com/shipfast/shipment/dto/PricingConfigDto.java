package com.shipfast.shipment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingConfigDto {

    private Double standardRatePerKg;
    private Double expressMultiplier;
    private Double sameDayMultiplier;
    private Double distanceSurcharge;
    private Double fuelSurchargePct;
    private Double gstPct;
    private Double codHandlingFee;
}
