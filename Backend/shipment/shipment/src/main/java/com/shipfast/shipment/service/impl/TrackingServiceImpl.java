package com.shipfast.shipment.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.shipfast.shipment.entity.TrackingEvent;
import com.shipfast.shipment.repository.TrackingEventRepository;
import com.shipfast.shipment.service.TrackingService;

@Service
public class TrackingServiceImpl implements TrackingService {

    private final TrackingEventRepository trackingEventRepository;

    public TrackingServiceImpl(TrackingEventRepository trackingEventRepository) {
        this.trackingEventRepository = trackingEventRepository;
    }

    @Override
    public void addTrackingEvent(String shipmentId,
                                 String trackingNumber,
                                 String status,
                                 String location,
                                 String remarks) {

        TrackingEvent event = new TrackingEvent();
        event.setId(UUID.randomUUID().toString());
        event.setShipmentId(shipmentId);
        event.setTrackingNumber(trackingNumber);
        event.setStatus(status);
        event.setLocation(location);
        event.setRemarks(remarks);
        event.setTimestamp(LocalDateTime.now());

        trackingEventRepository.save(event);
    }

    @Override
    public List<TrackingEvent> getTrackingHistory(String trackingNumber) {
        return trackingEventRepository
                .findByTrackingNumberOrderByTimestampAsc(trackingNumber);
    }
}
