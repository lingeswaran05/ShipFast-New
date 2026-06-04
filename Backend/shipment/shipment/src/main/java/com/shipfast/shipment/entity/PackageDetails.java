package com.shipfast.shipment.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackageDetails {

    private double weight;
    private String dimensions;
    private String type;
    private String description;
}
