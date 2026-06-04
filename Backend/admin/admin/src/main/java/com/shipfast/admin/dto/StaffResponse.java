package com.shipfast.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class StaffResponse {

    private String staffId;
    private String userId;
    private String role;
    private String branchId;
    private LocalDate joiningDate;
    private String status;
}
