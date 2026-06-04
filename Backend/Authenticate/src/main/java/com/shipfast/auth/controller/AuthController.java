package com.shipfast.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shipfast.auth.dto.ApiResponse;
import com.shipfast.auth.dto.AuthResponse;
import com.shipfast.auth.dto.ChangePasswordRequest;
import com.shipfast.auth.dto.ForgotPasswordRequest;
import com.shipfast.auth.dto.LoginRequest;
import com.shipfast.auth.dto.RefreshRequest;
import com.shipfast.auth.dto.RegisterRequest;
import com.shipfast.auth.dto.ResetPasswordRequest;
import com.shipfast.auth.dto.RoleUpdateRequest;
import com.shipfast.auth.dto.UserProfileResponse;
import com.shipfast.auth.dto.VerifyOtpRequest;
import com.shipfast.auth.service.AuthService;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }


    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @RequestBody RegisterRequest request) {

        AuthResponse response = authService.register(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Registration successful", response)
        );
    }


    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Login successful", response)
        );
    }

    // ================= REFRESH =================

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @RequestBody RefreshRequest request) {

        AuthResponse response = authService.refreshToken(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Token refreshed", response)
        );
    }

    // ================= LOGOUT =================

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @RequestBody RefreshRequest request) {

        authService.logout(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Logged out successfully", null)
        );
    }

    // ================= PROFILE =================

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(
            Authentication authentication) {

        String email = authentication.getName();

        UserProfileResponse profile = authService.getProfile(email);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile fetched successfully", profile)
        );
    }

    @GetMapping("/internal/users/{emailOrId}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getInternalUser(
            @PathVariable String emailOrId) {

        UserProfileResponse profile = authService.getUserByEmailOrId(emailOrId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User fetched successfully", profile)
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            Authentication authentication,
            @RequestBody RegisterRequest request) {

        String email = authentication.getName();

        UserProfileResponse profile =
                authService.updateProfile(email, request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile updated successfully", profile)
        );
    }

    // ================= CHANGE PASSWORD =================

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            Authentication authentication,
            @RequestBody ChangePasswordRequest request) {

        String email = authentication.getName();

        authService.changePassword(email, request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Password changed successfully", null)
        );
    }

    // ================= FORGOT PASSWORD =================

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @RequestBody ForgotPasswordRequest request) {

        authService.forgotPassword(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "OTP sent successfully", null)
        );
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyOtp(
            @RequestBody VerifyOtpRequest request) {

        authService.verifyOtp(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "OTP verified successfully", null)
        );
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Password reset successfully", null)
        );
    }

    // ================= ADMIN USER MANAGEMENT =================

    @GetMapping("/admin/users")
    public ResponseEntity<ApiResponse<java.util.List<UserProfileResponse>>> getAllUsers() {

        java.util.List<UserProfileResponse> users = authService.getAllUsers();

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Users fetched successfully", users)
        );
    }

        @PutMapping({"/admin/users/{emailOrId}/role", "/admin/users/{emailOrId}/role/"})
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateUserRole(
            @PathVariable String emailOrId,
                        @RequestBody(required = false) RoleUpdateRequest request,
                        @RequestParam(value = "role", required = false) String roleParam) {

                String role = roleParam;
                if ((role == null || role.isBlank()) && request != null) {
                        role = request.getRole();
                }

                if (role == null || role.isBlank()) {
                        throw new IllegalArgumentException("Role is required");
                }

                UserProfileResponse updatedProfile = authService.updateUserRole(emailOrId, role);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User role updated successfully", updatedProfile)
        );
    }

    @DeleteMapping("/admin/users/{emailOrId}")
    public ResponseEntity<ApiResponse<String>> deleteUser(
            @PathVariable String emailOrId) {

        authService.deleteUser(emailOrId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User deleted successfully", null)
        );
    }
}
