package com.shipfast.admin.repository;

import com.shipfast.admin.entity.Hub;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface HubRepository extends MongoRepository<Hub, String> {
}
