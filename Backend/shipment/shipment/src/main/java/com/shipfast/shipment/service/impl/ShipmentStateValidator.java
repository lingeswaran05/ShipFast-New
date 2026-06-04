package com.shipfast.shipment.service.impl;


import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ShipmentStateValidator {

    private static final Map<String, String> transitions = Map.of(
            "BOOKED", "IN_TRANSIT",
            "IN_TRANSIT", "OUT_FOR_DELIVERY",
            "OUT_FOR_DELIVERY", "DELIVERED"
    );

    public boolean isValidTransition(String current, String next) {

        return transitions.containsKey(current) &&
                transitions.get(current).equals(next);
    }
}
