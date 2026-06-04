package com.shipfast.shipment.dto;

import com.shipfast.shipment.entity.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ShipmentResponse {

    private String trackingNumber;
    private String status;
    private String serviceType;

    private Address sender;
    private Address receiver;

    private PackageDetails packageDetails;
    private PriceBreakdown priceBreakdown;

    private String origin;
    private String destination;

    private LocalDateTime bookingDate;
    private LocalDateTime estimatedDeliveryDate;
}
