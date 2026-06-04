package com.shipfast.admin.dto;

import lombok.Data;

@Data
public class VehicleRequest {

    private String vehicleNumber;
    private String type;
    private String driverUserId;
}
