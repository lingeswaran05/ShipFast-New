package com.shipfast.operations.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "cash_collections")
public class CashCollection {

    @Id
    private String collectionId;

    private String shipmentId;
    private double codAmount;
    private double upiAmount;
    private double cardAmount;
    private double totalAmount;

    private boolean verified;
    private boolean depositedToBank;

    private LocalDateTime timestamp;
}
