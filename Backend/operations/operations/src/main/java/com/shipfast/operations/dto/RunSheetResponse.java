package com.shipfast.operations.dto;

import java.time.LocalDate;
import java.util.List;

public class RunSheetResponse {

    private String runSheetId;
    private String agentId;
    private String hubId;
    private LocalDate date;
    private List<String> shipmentTrackingNumbers;

    public String getRunSheetId() { return runSheetId; }
    public void setRunSheetId(String runSheetId) { this.runSheetId = runSheetId; }
    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public String getHubId() { return hubId; }
    public void setHubId(String hubId) { this.hubId = hubId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public List<String> getShipmentTrackingNumbers() { return shipmentTrackingNumbers; }
    public void setShipmentTrackingNumbers(List<String> shipmentTrackingNumbers) { this.shipmentTrackingNumbers = shipmentTrackingNumbers; }
}
