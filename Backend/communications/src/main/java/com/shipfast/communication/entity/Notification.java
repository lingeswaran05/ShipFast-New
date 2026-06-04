package com.shipfast.communication.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Data
public class Notification {

    @Id
    private String id;

    private String userId;
    private String type;
    private String message;
    private String status;
    private LocalDateTime createdAt;
}
