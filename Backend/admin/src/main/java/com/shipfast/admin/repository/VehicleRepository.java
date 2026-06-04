package com.shipfast.admin.repository;

import com.shipfast.admin.entity.Vehicle;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VehicleRepository extends MongoRepository<Vehicle, String> {
}
