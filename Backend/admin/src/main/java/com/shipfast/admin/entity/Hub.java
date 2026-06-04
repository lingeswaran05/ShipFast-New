package com.shipfast.admin.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "hubs")
public class Hub {

    @Id
    private String hubId;

    private String city;
    private String state;
    private String pincode;
}
