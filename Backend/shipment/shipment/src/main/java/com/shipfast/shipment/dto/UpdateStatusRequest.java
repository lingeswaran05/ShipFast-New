package com.shipfast.shipment.dto;

import lombok.Data;

@Data
public class UpdateStatusRequest {
    private String status;
    private String location;
    private String remarks;
    private String proofOfDeliveryImage;
    private String deliveredBy;
    private String deliveredByAgentId;
    private String paymentStatus;
    private String paymentCollectedAt;
}
