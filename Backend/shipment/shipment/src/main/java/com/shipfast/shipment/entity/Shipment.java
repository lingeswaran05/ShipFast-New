package com.shipfast.shipment.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "shipments")
public class Shipment {

    @Id
    private String id;

    private String trackingNumber;
    private String customerId;
    private String branchId;

    private String status;
    private String serviceType;
    private String paymentMethod;
    private String paymentStatus;

    private Double cost;

    private LocalDateTime createdAt;
    private LocalDateTime estimatedDelivery;
    private LocalDateTime updatedAt;
    private LocalDateTime paymentCollectedAt;

    private Address sender;
    private Address recipient;

    private PackageDetails packageDetails;

    @Builder.Default
    private List<TrackingEvent> history = new ArrayList<>();

    private String assignedAgentId;
    private Integer rating;
    private String ratingComment;
    private String proofOfDeliveryImage;
    private LocalDateTime deliveredAt;
    private String deliveredBy;
    private String deliveredByAgentId;
    private String runSheetId;
}
