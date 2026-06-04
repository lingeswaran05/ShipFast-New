package com.shipfast.shipment.service;

import java.util.List;

import com.shipfast.shipment.entity.TrackingEvent;

public interface TrackingService {

    void addTrackingEvent(String shipmentId,
                          String trackingNumber,
                          String status,
                          String location,
                          String remarks);

    List<TrackingEvent> getTrackingHistory(String trackingNumber);
}
