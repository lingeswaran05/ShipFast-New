package com.shipfast.reporting.service;

import com.shipfast.reporting.dto.ReportSummaryResponse;

public interface ReportingService {
    ReportSummaryResponse generateSummary();
    String exportShipmentsCsv();
}
