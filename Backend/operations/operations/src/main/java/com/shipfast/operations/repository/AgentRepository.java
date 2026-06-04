package com.shipfast.operations.repository;

import com.shipfast.operations.entity.AgentProfile;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AgentRepository extends MongoRepository<AgentProfile, String> {
    Optional<AgentProfile> findByUserId(String userId);
    void deleteByUserId(String userId);
    List<AgentProfile> findByVerificationStatus(String verificationStatus);
}
