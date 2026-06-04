package com.shipfast.admin.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "branches")
public class Branch {

    @Id
    private String branchId;

    private String name;
    private String type;
    private String address;
    private String state;
    private String managerUserId;
    private String managerName;
    private String contact;
    private Integer staffCount;
    private String status;
    private String description;
}
