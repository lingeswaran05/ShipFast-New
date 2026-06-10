package com.shipfast.operations.entity;

public enum AgentAvailability {
    AVAILABLE,
    ACTIVE,
    READY,
    IN_TRANSIT,
    ONLINE,
    LOGGED_IN,
    LOGGED_IN,
    OFFLINE,
    UNAVAILABLE;

    public boolean isEligibleForAssignment() {
        return this != OFFLINE && this != UNAVAILABLE;
    }
}
