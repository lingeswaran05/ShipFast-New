package com.shipfast.shipment.entity;

import java.time.LocalDateTime;

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
@Document(collection = "tracking_events")
public class TrackingEvent {

    @Id
    private String id;

    private String shipmentId;
    private String trackingNumber;

    private String status;
    private String location;
    private LocalDateTime timestamp;
    private String remarks;
}
