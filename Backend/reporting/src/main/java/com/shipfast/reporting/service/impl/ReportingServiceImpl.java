package com.shipfast.reporting.service.impl;

import com.shipfast.reporting.dto.ReportSummaryResponse;
import com.shipfast.reporting.entity.ReportSnapshot;
import com.shipfast.reporting.repository.ReportSnapshotRepository;
import com.shipfast.reporting.service.ReportingService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReportingServiceImpl implements ReportingService {

    private final ReportSnapshotRepository repository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${shipment.service.url}")
    private String shipmentServiceUrl;

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchShipments() {
        String url = shipmentServiceUrl + "/api/v1/shipments?page=0&limit=1000";
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
            url,
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<Map<String, Object>>() {
            }
        );
        Map<String, Object> body = response.getBody();
        if (body == null) {
            return new ArrayList<>();
        }
        Object data = body.get("data");
        if (data instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return new ArrayList<>();
    }

    @Override
    public ReportSummaryResponse generateSummary() {
        List<Map<String, Object>> shipments = fetchShipments();
        long total = shipments.size();
        long delivered = shipments.stream().filter(s -> "DELIVERED".equalsIgnoreCase(String.valueOf(s.get("status")))).count();
        long inTransit = shipments.stream().filter(s -> "IN_TRANSIT".equalsIgnoreCase(String.valueOf(s.get("status"))) || "OUT_FOR_DELIVERY".equalsIgnoreCase(String.valueOf(s.get("status")))).count();
        long cancelled = shipments.stream().filter(s -> "CANCELLED".equalsIgnoreCase(String.valueOf(s.get("status")))).count();
        BigDecimal totalRevenue = shipments.stream()
                .map(s -> {
                    Object cost = s.get("cost");
                    if (cost == null) return BigDecimal.ZERO;
                    try {
                        return new BigDecimal(String.valueOf(cost));
                    } catch (Exception ex) {
                        return BigDecimal.ZERO;
                    }
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgTicket = total > 0 ? totalRevenue.divide(BigDecimal.valueOf(total), 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

        ReportSnapshot snapshot = ReportSnapshot.builder()
                .totalShipments(total)
                .deliveredShipments(delivered)
                .inTransitShipments(inTransit)
                .cancelledShipments(cancelled)
                .totalRevenue(totalRevenue)
                .averageTicketSize(avgTicket)
                .generatedAt(LocalDateTime.now())
                .build();

        repository.save(Objects.requireNonNull(snapshot));

        return new ReportSummaryResponse(total, delivered, inTransit, cancelled, totalRevenue, avgTicket);
    }

    @Override
    public String exportShipmentsCsv() {
        List<Map<String, Object>> shipments = fetchShipments();
        StringBuilder csv = new StringBuilder("trackingNumber,status,serviceType,cost\n");
        for (Map<String, Object> shipment : shipments) {
            csv.append(String.valueOf(shipment.getOrDefault("trackingNumber", ""))).append(',')
                    .append(String.valueOf(shipment.getOrDefault("status", ""))).append(',')
                    .append(String.valueOf(shipment.getOrDefault("serviceType", ""))).append(',')
                    .append(String.valueOf(shipment.getOrDefault("cost", "0"))).append('\n');
        }
        return csv.toString();
    }
}
