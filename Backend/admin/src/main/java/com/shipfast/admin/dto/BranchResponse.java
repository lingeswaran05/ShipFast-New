package com.shipfast.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BranchResponse {

    private String branchId;
    private String name;
    private String type;
    private String location;
    private String state;
    private String managerUserId;
    private int staffCount;
    private String status;
}
