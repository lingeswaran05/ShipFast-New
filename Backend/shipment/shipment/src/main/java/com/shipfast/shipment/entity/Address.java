package com.shipfast.shipment.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address {

    private String name;
    private String doorAddress;
    private String city;
    private String state;
    private String pincode;
    private String address;
    private String phone;
    private String email;
} 
