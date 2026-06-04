package com.shipfast.communication.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "support_tickets")
@Data
public class SupportTicket {

    @Id
    private String id;

    private String userId;
    private String subject;
    private String description;
    private String category;
    private String priority;
    private String status;
    private String assignedToRole;
    private String assignedToUserId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<SupportMessage> messages = new ArrayList<>();
}
