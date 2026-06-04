package com.shipfast.reporting.repository;

import com.shipfast.reporting.entity.ReportSnapshot;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReportSnapshotRepository extends MongoRepository<ReportSnapshot, String> {
}
