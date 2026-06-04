package com.shipfast.operations.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "delivery_scans")
public class DeliveryScan {

    @Id
    private String scanId;

    private String shipmentId;
    private String agentId;
    private String status;
    private LocalDateTime scannedAt;
    private String remarks;
}
