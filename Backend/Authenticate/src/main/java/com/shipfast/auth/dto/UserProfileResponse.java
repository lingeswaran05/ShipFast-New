package com.shipfast.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserProfileResponse {

    private String userId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String role;
    private String status;
}
