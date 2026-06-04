package com.shipfast.auth.dto;

import com.shipfast.auth.entity.UserRole;
import lombok.Data;

@Data
public class RegisterRequest {

    private String fullName;
    private String email;
    private String password;
    private String phoneNumber;

    private String address;
    private String city;
    private String state;
    private String pincode;

    private UserRole role;   // CUSTOMER default if null
}