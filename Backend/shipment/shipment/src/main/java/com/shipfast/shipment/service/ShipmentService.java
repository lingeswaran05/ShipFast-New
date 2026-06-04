package com.shipfast.shipment.service;

import java.time.LocalDate;
import java.util.List;

import com.shipfast.shipment.dto.AssignShipmentRequest;
import com.shipfast.shipment.dto.CalculateRateRequest;
import com.shipfast.shipment.dto.CreateShipmentRequest;
import com.shipfast.shipment.dto.PricingConfigDto;
import com.shipfast.shipment.dto.RateCalculationResponse;
import com.shipfast.shipment.dto.RatingRequest;
import com.shipfast.shipment.dto.ShipmentListResponse;
import com.shipfast.shipment.dto.UpdateShipmentRequest;
import com.shipfast.shipment.dto.UpdateStatusRequest;
import com.shipfast.shipment.entity.Shipment;

public interface ShipmentService {

    Shipment createShipment(CreateShipmentRequest request);

    ShipmentListResponse getAll(String status,
                                String branchId,
                                LocalDate dateFrom,
                                LocalDate dateTo,
                                Integer page,
                                Integer limit);

    List<Shipment> getMine(String customerId);

    Shipment getByTrackingNumber(String trackingNumber);

    Shipment getById(String shipmentId);

    Shipment updateShipment(String shipmentId, UpdateShipmentRequest request);

    void deleteShipment(String shipmentId);

    Shipment updateStatus(String shipmentId, UpdateStatusRequest request, String customerId);

    Shipment assignShipment(String shipmentId, AssignShipmentRequest request);

    Shipment addRating(String shipmentId, RatingRequest request);

    RateCalculationResponse calculateRate(CalculateRateRequest request);

    PricingConfigDto getPricingConfig();

    PricingConfigDto updatePricingConfig(PricingConfigDto request);
}
