package com.shipfast.operations.repository;

import com.shipfast.operations.entity.CashCollection;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CashCollectionRepository extends MongoRepository<CashCollection, String> {
}
