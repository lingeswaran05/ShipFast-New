package com.shipfast.admin.dto;

import lombok.Data;

@Data
public class StaffRequest {

    private String userId;
    private String role;
    private String branchId;
}
