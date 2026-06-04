package com.shipfast.auth.repository;

import com.shipfast.auth.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {

    Optional<UserProfile> findByUserId(String userId);

    boolean existsByPhoneNumber(String phoneNumber);
}