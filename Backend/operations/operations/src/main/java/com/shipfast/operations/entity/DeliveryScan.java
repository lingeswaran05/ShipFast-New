package com.shipfast.operations.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "delivery_scans")
public class DeliveryScan {

    @Id
    private String scanId;

    private String shipmentId;
    private String agentId;
    private String status;
    private String remarks;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getScanId() { return scanId; }
    public void setScanId(String scanId) { this.scanId = scanId; }
    public String getShipmentId() { return shipmentId; }
    public void setShipmentId(String shipmentId) { this.shipmentId = shipmentId; }
    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
