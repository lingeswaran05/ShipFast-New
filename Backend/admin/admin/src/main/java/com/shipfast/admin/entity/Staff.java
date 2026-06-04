package com.shipfast.admin.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "staff")
public class Staff {

    @Id
    private String staffId;

    private String userId;
    private String role;
    private String branchId;
    private LocalDate joiningDate;
    private String status;
}
