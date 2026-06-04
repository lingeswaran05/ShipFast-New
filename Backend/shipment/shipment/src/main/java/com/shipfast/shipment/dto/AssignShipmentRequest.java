package com.shipfast.shipment.dto;

import lombok.Data;

@Data
public class AssignShipmentRequest {
    private String agentId;
    private String runSheetId;
}
