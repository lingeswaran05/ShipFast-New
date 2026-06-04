package com.shipfast.operations.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InvoiceResponse {

    private String invoiceId;
    private String shipmentTrackingNumber;
    private double totalAmount;
    private String paymentStatus;
    private LocalDateTime createdAt;
}
