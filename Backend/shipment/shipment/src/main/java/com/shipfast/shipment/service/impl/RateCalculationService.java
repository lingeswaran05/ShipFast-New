package com.shipfast.shipment.service.impl;

import org.springframework.stereotype.Service;

import com.shipfast.shipment.entity.PackageDetails;
import com.shipfast.shipment.entity.PriceBreakdown;

@Service
public class RateCalculationService {

    public double calculateVolumetricWeight(PackageDetails details) {
    return details.getWeight();
    }

    public PriceBreakdown calculatePrice(String zone, double weight, String serviceType) {

        double baseRate = 0;

        if (zone.equalsIgnoreCase("A")) baseRate = weight * 50;
        else if (zone.equalsIgnoreCase("B")) baseRate = weight * 70;
        else baseRate = weight * 90;

        if (serviceType.equalsIgnoreCase("EXPRESS"))
            baseRate *= 1.5;

        double fuel = baseRate * 0.05;
        double tax = baseRate * 0.18;

        return PriceBreakdown.builder()
                .baseRate(baseRate)
                .fuelSurcharge(fuel)
                .tax(tax)
                .totalAmount(baseRate + fuel + tax)
                .build();
    }
}
