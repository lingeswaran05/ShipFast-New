package com.shipfast.communication.entity;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportMessage {
    private String messageId;
    private String senderId;
    private String senderName;
    private String senderRole;
    private String message;
    private LocalDateTime createdAt;
}
