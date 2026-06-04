package com.shipfast.operations.repository;

import com.shipfast.operations.entity.RunSheet;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RunSheetRepository extends MongoRepository<RunSheet, String> {
    List<RunSheet> findByAgentId(String agentId);
}
