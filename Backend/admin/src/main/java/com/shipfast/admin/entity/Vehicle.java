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
    private String driverName;
    private Integer seats;
    private String rcBook;
    private String photo;
    private String status;
}
