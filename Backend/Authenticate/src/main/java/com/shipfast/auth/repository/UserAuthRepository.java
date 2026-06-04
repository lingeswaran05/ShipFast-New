package com.shipfast.auth.repository;

import com.shipfast.auth.entity.UserAuth;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAuthRepository extends JpaRepository<UserAuth, String> {

    Optional<UserAuth> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<UserAuth> findByUserId(String userId);
}