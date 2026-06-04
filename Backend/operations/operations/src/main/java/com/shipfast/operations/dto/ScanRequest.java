package com.shipfast.operations.dto;

import lombok.Data;

@Data
public class ScanRequest {

    private String shipmentTrackingNumber;
    private String agentId;
    private String status;
}
