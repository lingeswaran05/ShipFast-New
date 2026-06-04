package com.shipfast.shipment.dto;

import java.util.List;

import com.shipfast.shipment.entity.Shipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentListResponse {
    private List<Shipment> data;
    private Pagination pagination;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pagination {
        private long totalItems;
        private int totalPages;
        private int currentPage;
    }
}
