package com.shipfast.communication.dto;

import lombok.Data;

@Data
public class SupportTicketStatusRequest {
    private String status;
    private String assignedToRole;
    private String assignedToUserId;
}
