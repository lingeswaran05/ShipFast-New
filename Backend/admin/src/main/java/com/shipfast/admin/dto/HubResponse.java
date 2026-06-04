package com.shipfast.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HubResponse {

    private String hubId;
    private String city;
    private String state;
    private String pincode;
}
