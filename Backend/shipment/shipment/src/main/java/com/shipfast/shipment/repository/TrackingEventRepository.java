package com.shipfast.shipment.repository;

import com.shipfast.shipment.entity.TrackingEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TrackingEventRepository extends MongoRepository<TrackingEvent, String> {

    List<TrackingEvent> findByTrackingNumberOrderByTimestampAsc(String trackingNumber);
}
