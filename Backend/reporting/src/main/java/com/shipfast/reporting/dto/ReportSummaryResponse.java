package com.shipfast.reporting.dto;

import java.math.BigDecimal;

public record ReportSummaryResponse(
        long totalShipments,
        long deliveredShipments,
        long inTransitShipments,
        long cancelledShipments,
        BigDecimal totalRevenue,
        BigDecimal averageTicketSize
) {
}
