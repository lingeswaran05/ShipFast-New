package com.shipfast.auth.service;

import com.shipfast.auth.dto.*;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshRequest request);

    void logout(RefreshRequest request);

    UserProfileResponse getProfile(String email);

    UserProfileResponse updateProfile(String email, RegisterRequest request);

    UserProfileResponse getUserByEmailOrId(String emailOrId);

    void changePassword(String email, ChangePasswordRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void verifyOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);

    java.util.List<UserProfileResponse> getAllUsers();

    UserProfileResponse updateUserRole(String emailOrId, String role);

    void deleteUser(String emailOrId);
}
