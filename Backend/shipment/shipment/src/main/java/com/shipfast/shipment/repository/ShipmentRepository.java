package com.shipfast.shipment.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.shipfast.shipment.entity.Shipment;

public interface ShipmentRepository extends MongoRepository<Shipment, String> {

    Optional<Shipment> findByTrackingNumber(String trackingNumber);
    long deleteAllByTrackingNumber(String trackingNumber);

    List<Shipment> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    Page<Shipment> findByStatusIgnoreCase(String status, Pageable pageable);

    Page<Shipment> findByBranchIdIgnoreCase(String branchId, Pageable pageable);

    Page<Shipment> findByStatusIgnoreCaseAndBranchIdIgnoreCase(String status, String branchId, Pageable pageable);

    @Query("{ 'createdAt' : { $gte: ?0, $lte: ?1 } }")
    List<Shipment> findByCreatedAtBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);
}
