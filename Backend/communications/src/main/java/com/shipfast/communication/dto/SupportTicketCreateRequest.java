package com.shipfast.communication.dto;

import lombok.Data;

@Data
public class SupportTicketCreateRequest {
    private String userId;
    private String subject;
    private String description;
    private String category;
    private String priority;
    private String senderName;
    private String senderRole;
}
