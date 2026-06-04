package com.shipfast.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VehicleResponse {

    private String vehicleId;
    private String vehicleNumber;
    private String type;
    private String driverUserId;
    private String status;
}
