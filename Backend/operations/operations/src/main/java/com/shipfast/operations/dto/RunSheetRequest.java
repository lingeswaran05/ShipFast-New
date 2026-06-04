package com.shipfast.operations.dto;

import lombok.Data;
import java.util.List;

@Data
public class RunSheetRequest {

    private String agentId;
    private String hubId;
    private List<String> shipmentTrackingNumbers;
}
