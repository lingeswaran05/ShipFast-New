package com.shipfast.operations.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "invoices")
public class Invoice {

    @Id
    private String invoiceId;

    private String shipmentTrackingNumber;
    private double baseRate;
    private double taxAndFees;
    private double totalAmount;

    private String paymentMode;
    private String paymentStatus;

    private LocalDateTime createdAt;
}
