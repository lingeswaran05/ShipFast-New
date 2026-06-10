package com.shipfast.operations.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "run_sheets")
public class RunSheet {

    @Id
    private String runSheetId;

    private String agentId;
    private String hubId;
    private LocalDate date;
    private List<String> shipmentIds;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getRunSheetId() { return runSheetId; }
    public void setRunSheetId(String runSheetId) { this.runSheetId = runSheetId; }
    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public String getHubId() { return hubId; }
    public void setHubId(String hubId) { this.hubId = hubId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public List<String> getShipmentIds() { return shipmentIds; }
    public void setShipmentIds(List<String> shipmentIds) { this.shipmentIds = shipmentIds; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
