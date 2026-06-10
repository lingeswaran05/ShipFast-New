package com.shipfast.auth.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import com.shipfast.auth.dto.AuthResponse;
import com.shipfast.auth.dto.ChangePasswordRequest;
import com.shipfast.auth.dto.ForgotPasswordRequest;
import com.shipfast.auth.dto.LoginRequest;
import com.shipfast.auth.dto.RefreshRequest;
import com.shipfast.auth.dto.RegisterRequest;
import com.shipfast.auth.dto.ResetPasswordRequest;
import com.shipfast.auth.dto.UserProfileResponse;
import com.shipfast.auth.dto.VerifyOtpRequest;
import com.shipfast.auth.entity.PasswordResetOtp;
import com.shipfast.auth.entity.RefreshToken;
import com.shipfast.auth.entity.UserAuth;
import com.shipfast.auth.entity.UserProfile;
import com.shipfast.auth.entity.UserRole;
import com.shipfast.auth.exception.CustomException;
import com.shipfast.auth.repository.PasswordResetOtpRepository;
import com.shipfast.auth.repository.RefreshTokenRepository;
import com.shipfast.auth.repository.UserAuthRepository;
import com.shipfast.auth.repository.UserProfileRepository;
import com.shipfast.auth.security.JwtService;
import com.shipfast.auth.utility.OtpGenerator;
import com.shipfast.auth.utility.PasswordValidator;
import com.shipfast.auth.utility.UserIdGenerator;

import jakarta.transaction.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final EmailService emailService;
    private final UserAuthRepository userAuthRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${operations.service.url}")
    private String operationsServiceUrl;

    private String operationsApiBaseUrl() {
        return appendPathIfMissing(operationsServiceUrl, "/api/operations");
    }

    public AuthServiceImpl(
            EmailService emailService,
            UserAuthRepository userAuthRepository,
            UserProfileRepository userProfileRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetOtpRepository otpRepository,
            BCryptPasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.emailService = emailService;
        this.userAuthRepository = userAuthRepository;
        this.userProfileRepository = userProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // ================= REGISTER =================

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (request.getEmail() == null || request.getEmail().isBlank())
            throw new CustomException("Email is required");

        if (request.getPhoneNumber() == null || request.getPhoneNumber().isBlank())
            throw new CustomException("Phone number is required");

        if (request.getPassword() == null || request.getPassword().isBlank())
            throw new CustomException("Password is required");

        if (userAuthRepository.existsByEmail(request.getEmail()))
            throw new CustomException("Email already registered");

        if (userProfileRepository.existsByPhoneNumber(request.getPhoneNumber()))
            throw new CustomException("Phone number already registered");

        if (!PasswordValidator.isValid(request.getPassword()))
            throw new CustomException("Password does not meet security requirements");

        String userId = UserIdGenerator.generateUserId();
        while (userAuthRepository.existsById(userId)) {
            userId = UserIdGenerator.generateUserId();
        }

        UserAuth userAuth = new UserAuth();
        userAuth.setUserId(userId);
        userAuth.setEmail(request.getEmail());
        userAuth.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userAuth.setRole(request.getRole() != null ? request.getRole() : UserRole.CUSTOMER);

        userAuthRepository.save(userAuth);

        UserProfile profile = new UserProfile();
        profile.setUserAuth(userAuth);
        profile.setFullName(request.getFullName());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setAddress(request.getAddress());
        profile.setCity(request.getCity());
        profile.setState(request.getState());
        profile.setPincode(request.getPincode());

        userProfileRepository.save(profile);

        String accessToken = jwtService.generateAccessToken(userAuth.getEmail(), userAuth.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(userAuth.getEmail());

        saveRefreshToken(userId, refreshToken);

        return new AuthResponse(userId, accessToken, refreshToken, userAuth.getRole().name());
    }

    // ================= LOGIN =================

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {

        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new CustomException("Email and password are required");
        }

        UserAuth user = userAuthRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new CustomException("Invalid credentials");

        user.setActive(true);
        userAuthRepository.save(user);
        syncAgentAvailability(user, "AVAILABLE");

        refreshTokenRepository.deleteByUserId(user.getUserId());
        refreshTokenRepository.flush();

        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        saveRefreshToken(user.getUserId(), refreshToken);

        return new AuthResponse(user.getUserId(), accessToken, refreshToken, user.getRole().name());
    }

    // ================= REFRESH =================

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshRequest request) {

        RefreshToken token = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new CustomException("Invalid refresh token"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.deleteByToken(token.getToken());
            throw new CustomException("Refresh token expired");
        }

        UserAuth user = userAuthRepository.findByUserId(token.getUserId())
                .orElseThrow(() -> new CustomException("User not found"));

        String newAccessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());

        return new AuthResponse(user.getUserId(), newAccessToken, token.getToken(), user.getRole().name());
    }

    // ================= LOGOUT =================

    @Override
    @Transactional
    public void logout(RefreshRequest request) {
        if (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            refreshTokenRepository.findByToken(request.getRefreshToken())
                    .ifPresent(token -> userAuthRepository.findByUserId(token.getUserId()).ifPresent(user -> {
                        user.setActive(false);
                        userAuthRepository.save(user);
                        syncAgentAvailability(user, "OFFLINE");
                    }));
            refreshTokenRepository.deleteByToken(request.getRefreshToken());
            return;
        }

        // Missing refresh token: skip token/user session updates.
    }

    // ================= PROFILE =================

    @Override
    public UserProfileResponse getProfile(String email) {

        UserAuth user = userAuthRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException("User not found"));

        UserProfile profile = userProfileRepository.findByUserId(user.getUserId())
                .orElseThrow(() -> new CustomException("Profile not found"));

        return mapToProfileResponse(user, profile);
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(String email, RegisterRequest request) {

        UserAuth user = userAuthRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException("User not found"));

        UserProfile profile = userProfileRepository.findByUserId(user.getUserId())
                .orElseThrow(() -> new CustomException("Profile not found"));

        profile.setFullName(request.getFullName());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setAddress(request.getAddress());
        profile.setCity(request.getCity());
        profile.setState(request.getState());
        profile.setPincode(request.getPincode());
        profile.setUpdatedAt(LocalDateTime.now());

        userProfileRepository.save(profile);

        return mapToProfileResponse(user, profile);
    }

    @Override
    public UserProfileResponse getUserByEmailOrId(String emailOrId) {
        UserAuth user = userAuthRepository.findByEmail(emailOrId)
                .orElseGet(() -> userAuthRepository.findByUserId(emailOrId)
                .orElseThrow(() -> new CustomException("User not found")));

        UserProfile profile = userProfileRepository.findByUserId(user.getUserId())
                .orElse(new UserProfile());

        return mapToProfileResponse(user, profile);
    }

    // ================= CHANGE PASSWORD =================

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {

        UserAuth user = userAuthRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash()))
            throw new CustomException("Old password incorrect");

        if (!PasswordValidator.isValid(request.getNewPassword()))
            throw new CustomException("New password is weak");

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userAuthRepository.save(user);
    }

    // ================= FORGOT PASSWORD =================

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {

        userAuthRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException("Email not registered"));

        String otp = OtpGenerator.generateOtp();

        PasswordResetOtp resetOtp = new PasswordResetOtp();
        resetOtp.setEmail(request.getEmail());
        resetOtp.setOtp(otp);
        resetOtp.setExpiryTime(LocalDateTime.now().plusMinutes(5));
        resetOtp.setVerified(false);

        otpRepository.deleteByEmail(request.getEmail());
        otpRepository.save(resetOtp);

        emailService.sendOtpEmail(request.getEmail(), otp);
    }

    @Override
    @Transactional
    public void verifyOtp(VerifyOtpRequest request) {

        PasswordResetOtp storedOtp = otpRepository
                .findTopByEmailOrderByIdDesc(request.getEmail())
                .orElseThrow(() -> new CustomException("OTP not found"));

        if (storedOtp.getExpiryTime().isBefore(LocalDateTime.now()))
            throw new CustomException("OTP expired");

        if (!storedOtp.getOtp().equals(request.getOtp()))
            throw new CustomException("Invalid OTP");

        storedOtp.setVerified(true);
        otpRepository.save(storedOtp);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {

        PasswordResetOtp storedOtp = otpRepository
                .findTopByEmailOrderByIdDesc(request.getEmail())
                .orElseThrow(() -> new CustomException("OTP verification required"));

        if (!storedOtp.isVerified())
            throw new CustomException("OTP not verified");

        UserAuth user = userAuthRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException("User not found"));

        if (!PasswordValidator.isValid(request.getNewPassword()))
            throw new CustomException("Weak password");

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userAuthRepository.save(user);

        otpRepository.deleteByEmail(request.getEmail());
    }

    private void saveRefreshToken(String userId, String token) {

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(userId);
        refreshToken.setToken(token);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));

        refreshTokenRepository.save(refreshToken);
    }

    private void syncAgentAvailability(UserAuth user, String availability) {
        if (user == null || user.getRole() != UserRole.AGENT) return;
        String userId = user.getUserId();
        if (userId == null || userId.isBlank()) return;

        String endpoint = String.format(
                "%s/agents/profile/%s",
                operationsApiBaseUrl(),
                UriUtils.encodePathSegment(userId, java.nio.charset.StandardCharsets.UTF_8)
        );
        try {
            restTemplate.put(endpoint, Map.of("availabilityStatus", availability));
        } catch (RestClientException ignored) {
            // keep authentication flow non-blocking even if operations service is temporarily unavailable
        }
    }

    private UserProfileResponse mapToProfileResponse(UserAuth user, UserProfile profile) {

        return new UserProfileResponse(
                user.getUserId(),
                profile.getFullName(),
                user.getEmail(),
                profile.getPhoneNumber(),
                profile.getAddress(),
                profile.getCity(),
                profile.getState(),
                profile.getPincode(),
                user.getRole().name(),
                user.isActive() ? "active" : "inactive"
        );
    }

    // ================= ADMIN MANAGEMENT =================

    @Override
    public java.util.List<UserProfileResponse> getAllUsers() {
        return userAuthRepository.findAll().stream().map(user -> {
            UserProfile profile = userProfileRepository.findByUserId(user.getUserId()).orElse(new UserProfile());
            return mapToProfileResponse(user, profile);
        }).collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserRole(String emailOrId, String roleStr) {
        if (roleStr == null || roleStr.isBlank()) {
            throw new CustomException("Role is required");
        }

        UserAuth user = userAuthRepository.findByEmail(emailOrId)
                .orElseGet(() -> userAuthRepository.findByUserId(emailOrId)
                .orElseThrow(() -> new CustomException("User not found")));
        
        try {
            user.setRole(UserRole.valueOf(roleStr.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new CustomException("Invalid role");
        }

        user.setUpdatedAt(LocalDateTime.now());
        
        userAuthRepository.save(user);
        UserProfile profile = userProfileRepository.findByUserId(user.getUserId()).orElse(new UserProfile());
        return mapToProfileResponse(user, profile);
    }

    @Override
    @Transactional
    public void deleteUser(String emailOrId) {
        UserAuth user = userAuthRepository.findByEmail(emailOrId)
                .orElseGet(() -> userAuthRepository.findByUserId(emailOrId)
                .orElseThrow(() -> new CustomException("User not found")));

        hardDeleteOperationsProfiles(user);
        userProfileRepository.findByUserId(user.getUserId()).ifPresent(userProfileRepository::delete);
        refreshTokenRepository.deleteByUserId(user.getUserId());
        userAuthRepository.delete(user);
    }

    private void hardDeleteOperationsProfiles(UserAuth user) {
        List<String> identities = List.of(
                user.getUserId() != null ? user.getUserId().trim() : "",
                user.getEmail() != null ? user.getEmail().trim() : ""
        );

        for (String identity : identities) {
            if (identity == null || identity.isBlank()) {
                continue;
            }

            String encodedIdentity = UriUtils.encodePathSegment(identity, java.nio.charset.StandardCharsets.UTF_8);
            String endpoint = String.format("%s/agents/profile/%s", operationsApiBaseUrl(), encodedIdentity);
            try {
                restTemplate.delete(endpoint);
            } catch (HttpClientErrorException error) {
                if (error.getStatusCode() == HttpStatus.NOT_FOUND) {
                    continue;
                }
                throw new CustomException("Failed to hard delete user operational profile");
            } catch (RestClientException error) {
                throw new CustomException("Failed to hard delete user operational profile");
            }
        }
    }

    private String appendPathIfMissing(String baseUrl, String path) {
        String normalizedBase = stripTrailingSlash(baseUrl);
        if (normalizedBase.isEmpty()) {
            throw new CustomException("Required service URL is not configured");
        }
        return normalizedBase.endsWith(path) ? normalizedBase : normalizedBase + path;
    }

    private String stripTrailingSlash(String value) {
        return value == null ? "" : value.replaceAll("/+$", "").trim();
    }
}
