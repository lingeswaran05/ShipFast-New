package com.shipfast.shipment.repository;

import com.shipfast.shipment.entity.PricingConfig;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PricingConfigRepository extends MongoRepository<PricingConfig, String> {
}
