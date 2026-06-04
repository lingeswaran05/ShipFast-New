package com.shipfast.admin.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "vehicles")
public class Vehicle {

    @Id
    private String vehicleId;

    private String vehicleNumber;
    private String type;
    private String driverUserId;
    private String status;
}
