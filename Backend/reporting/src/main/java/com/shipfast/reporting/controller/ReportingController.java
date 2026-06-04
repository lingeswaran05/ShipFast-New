package com.shipfast.reporting.controller;

import com.shipfast.reporting.dto.ApiResponse;
import com.shipfast.reporting.dto.ReportSummaryResponse;
import com.shipfast.reporting.service.ReportingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor

public class ReportingController {

    private final ReportingService reportingService;

    @GetMapping("/summary")
    public ApiResponse<ReportSummaryResponse> getSummary() {
        return new ApiResponse<>(true, "Report summary generated", reportingService.generateSummary());
    }

    @GetMapping(value = "/export/shipments.csv", produces = "text/csv")
    public ResponseEntity<String> exportShipmentsCsv() {
        String csv = reportingService.exportShipmentsCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=shipments-report.csv")
                .contentType(MediaType.valueOf("text/csv"))
                .body(csv);
    }
}
