package com.shipfast.operations.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CashCollectionResponse {

    private String collectionId;
    private String shipmentTrackingNumber;
    private double totalAmount;
    private boolean verified;
    private boolean depositedToBank;
    private LocalDateTime timestamp;
}
