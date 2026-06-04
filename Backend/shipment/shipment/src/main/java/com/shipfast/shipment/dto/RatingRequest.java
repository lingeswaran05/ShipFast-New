package com.shipfast.shipment.dto;

import lombok.Data;

@Data
public class RatingRequest {
    private Integer rating;
    private String comment;
}
