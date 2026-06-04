package com.shipfast.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {

    private String userId;
    private String accessToken;
    private String refreshToken;
    private String role;
}