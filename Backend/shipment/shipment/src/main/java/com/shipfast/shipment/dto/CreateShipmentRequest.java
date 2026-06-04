package com.shipfast.shipment.dto;

import com.shipfast.shipment.entity.Address;
import com.shipfast.shipment.entity.PackageDetails;

import lombok.Data;

@Data
public class CreateShipmentRequest {

    private String customerId;
    private String branchId;

    private Address sender;
    private Address recipient;
    private PackageDetails packageDetails;
    private String serviceType;
    private String paymentMethod;
    private Double quotedCost;
}
