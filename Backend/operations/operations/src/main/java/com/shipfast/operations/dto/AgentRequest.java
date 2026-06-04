package com.shipfast.operations.dto;

import lombok.Data;

@Data
public class AgentRequest {

    private String userId;
    private String licenseNumber;
    private String vehicleNumber;
    private String rcBookNumber;
    private String aadharNumber;
    private String bloodType;
    private String shiftTiming;
}
