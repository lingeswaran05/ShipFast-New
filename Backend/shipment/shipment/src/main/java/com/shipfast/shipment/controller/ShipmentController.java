package com.shipfast.shipment.controller;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
import com.shipfast.shipment.service.ShipmentService;

@RestController
@RequestMapping("/api/v1/shipments")

public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @PostMapping
    public ResponseEntity<Shipment> createShipment(@RequestBody CreateShipmentRequest request,
                                                   @RequestParam(value = "userId", required = false) String userId,
                                                   @RequestParam(value = "customerId", required = false) String customerIdParam,
                                                   @RequestParam(value = "branchId", required = false) String branchIdParam,
                                                   @RequestHeader(value = "X-User-Id", required = false) String customerIdHeader,
                                                   @RequestHeader(value = "X-Branch-Id", required = false) String branchIdHeader) {
        request.setCustomerId(firstNonBlank(
                request.getCustomerId(),
                userId,
                customerIdParam,
                customerIdHeader
        ));
        request.setBranchId(firstNonBlank(
                request.getBranchId(),
                branchIdParam,
                branchIdHeader
        ));
        Shipment created = shipmentService.createShipment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ShipmentListResponse getAllShipments(@RequestParam(required = false) String status,
                                                @RequestParam(required = false) String branchId,
                                                @RequestParam(required = false) LocalDate dateFrom,
                                                @RequestParam(required = false) LocalDate dateTo,
                                                @RequestParam(required = false) Integer page,
                                                @RequestParam(required = false) Integer limit) {
        return shipmentService.getAll(status, branchId, dateFrom, dateTo, page, limit);
    }

    @GetMapping("/mine")
    public List<Shipment> getMine(@RequestParam(value = "userId", required = false) String userId,
                                  @RequestParam(value = "customerId", required = false) String customerIdParam,
                                  @RequestHeader(value = "X-User-Id", required = false) String customerIdHeader) {
        String customerId = firstNonBlank(userId, customerIdParam, customerIdHeader);
        if (customerId == null || customerId.isBlank()) {
            return Collections.emptyList();
        }
        return shipmentService.getMine(customerId);
    }

    @GetMapping("/track/{trackingNumber}")
    public Shipment trackShipment(@PathVariable String trackingNumber) {
        return shipmentService.getByTrackingNumber(trackingNumber);
    }

    @GetMapping("/{shipmentId}")
    public Shipment getById(@PathVariable String shipmentId) {
        return shipmentService.getById(shipmentId);
    }

    @PutMapping("/{shipmentId}")
    public Shipment updateShipment(@PathVariable String shipmentId,
                                   @RequestBody UpdateShipmentRequest request) {
        return shipmentService.updateShipment(shipmentId, request);
    }

    @DeleteMapping("/{shipmentId}")
    public ResponseEntity<Void> deleteShipment(@PathVariable String shipmentId) {
        shipmentService.deleteShipment(shipmentId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{shipmentId}/status")
    public Shipment updateStatus(@PathVariable String shipmentId,
                                 @RequestBody UpdateStatusRequest request,
                                 @RequestParam(value = "userId", required = false) String userId,
                                 @RequestHeader(value = "X-User-Id", required = false) String customerIdHeader) {
        String customerId = firstNonBlank(userId, customerIdHeader);
        return shipmentService.updateStatus(shipmentId, request, customerId);
    }

    @PatchMapping("/{shipmentId}/assign")
    public Shipment assignShipment(@PathVariable String shipmentId,
                                   @RequestBody AssignShipmentRequest request) {
        return shipmentService.assignShipment(shipmentId, request);
    }

    @PostMapping("/{shipmentId}/assign")
    public Shipment assignShipmentPost(@PathVariable String shipmentId,
                                       @RequestBody AssignShipmentRequest request) {
        return shipmentService.assignShipment(shipmentId, request);
    }

    @PostMapping("/{shipmentId}/rating")
    public Shipment rateShipment(@PathVariable String shipmentId,
                                 @RequestBody RatingRequest request) {
        return shipmentService.addRating(shipmentId, request);
    }

    @PostMapping("/calculate-rate")
    public RateCalculationResponse calculateRate(@RequestBody CalculateRateRequest request) {
        return shipmentService.calculateRate(request);
    }

    @GetMapping("/pricing-config")
    public PricingConfigDto getPricingConfig() {
        return shipmentService.getPricingConfig();
    }

    @PutMapping("/pricing-config")
    public PricingConfigDto updatePricingConfig(@RequestBody PricingConfigDto request) {
        return shipmentService.updatePricingConfig(request);
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
