package com.shipfast.admin.repository;

import com.shipfast.admin.entity.Staff;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StaffRepository extends MongoRepository<Staff, String> {

    List<Staff> findByBranchId(String branchId);
}
