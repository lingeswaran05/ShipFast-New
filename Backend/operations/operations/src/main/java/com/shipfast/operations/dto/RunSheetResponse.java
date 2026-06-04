package com.shipfast.operations.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class RunSheetResponse {

    private String runSheetId;
    private String agentId;
    private String hubId;
    private LocalDate date;
    private List<String> shipmentTrackingNumbers;
}
