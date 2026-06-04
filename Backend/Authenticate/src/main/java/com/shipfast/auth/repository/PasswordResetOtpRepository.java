package com.shipfast.auth.repository;

import com.shipfast.auth.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByEmailOrderByIdDesc(String email);

    void deleteByEmail(String email);
}