package com.shipfast.shipment.entity;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "pricing_slabs")
public class PricingSlab {

    private String id;

    private double weightFrom;
    private double weightTo;

    private double zoneA;
    private double zoneB;
    private double zoneC;
}
