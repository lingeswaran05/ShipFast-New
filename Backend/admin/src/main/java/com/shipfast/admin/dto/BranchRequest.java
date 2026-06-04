package com.shipfast.admin.dto;

import lombok.Data;

@Data
public class BranchRequest {

    private String name;
    private String type;
    private String location;
    private String state;
    private String managerUserId;
}
