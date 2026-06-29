package com.shipfast.auth.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.shipfast.auth.entity.RoleRequest;

public interface RoleRequestRepository extends JpaRepository<RoleRequest, String> {

    List<RoleRequest> findByStatusInOrderByCreatedAtDesc(Collection<String> statuses);

    Optional<RoleRequest> findFirstByUserIdAndStatusInOrderByCreatedAtDesc(String userId, Collection<String> statuses);

    Optional<RoleRequest> findFirstByUserIdOrderByCreatedAtDesc(String userId);
}
