package com.shipfast.communication.dto;

import lombok.Data;

@Data
public class SupportTicketReplyRequest {
    private String senderId;
    private String senderName;
    private String senderRole;
    private String message;
}
