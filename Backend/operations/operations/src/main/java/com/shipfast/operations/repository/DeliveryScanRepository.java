package com.shipfast.operations.repository;

import com.shipfast.operations.entity.DeliveryScan;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DeliveryScanRepository extends MongoRepository<DeliveryScan, String> {
}
