package com.shipfast.operations.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "run_sheets")
public class RunSheet {

    @Id
    private String runSheetId;

    private String agentId;
    private String hubId;
    private LocalDate date;
    private List<String> shipmentIds;
}
