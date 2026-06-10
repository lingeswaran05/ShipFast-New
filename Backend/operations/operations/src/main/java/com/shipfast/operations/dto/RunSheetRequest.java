package com.shipfast.operations.dto;

import java.util.List;

public class RunSheetRequest {

    private String agentId;
    private String hubId;
    private List<String> shipmentTrackingNumbers;

    public String getAgentId() {
        return agentId;
    }

    public void setAgentId(String agentId) {
        this.agentId = agentId;
    }

    public String getHubId() {
        return hubId;
    }

    public void setHubId(String hubId) {
        this.hubId = hubId;
    }

    public List<String> getShipmentTrackingNumbers() {
        return shipmentTrackingNumbers;
    }

    public void setShipmentTrackingNumbers(List<String> shipmentTrackingNumbers) {
        this.shipmentTrackingNumbers = shipmentTrackingNumbers;
    }
}
