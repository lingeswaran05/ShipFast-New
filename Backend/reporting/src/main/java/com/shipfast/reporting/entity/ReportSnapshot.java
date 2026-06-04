package com.shipfast.reporting.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "report_snapshots")
public class ReportSnapshot {
    @Id
    private String id;
    private long totalShipments;
    private long deliveredShipments;
    private long inTransitShipments;
    private long cancelledShipments;
    private BigDecimal totalRevenue;
    private BigDecimal averageTicketSize;
    private LocalDateTime generatedAt;
}
