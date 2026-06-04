package com.shipfast.admin.repository;

import com.shipfast.admin.entity.Branch;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BranchRepository extends MongoRepository<Branch, String> {
}
