package com.shipfast.shipment.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriUtils;

import com.shipfast.shipment.dto.AssignShipmentRequest;
import com.shipfast.shipment.dto.CalculateRateRequest;
import com.shipfast.shipment.dto.CreateShipmentRequest;
import com.shipfast.shipment.dto.PricingConfigDto;
import com.shipfast.shipment.dto.RateCalculationResponse;
import com.shipfast.shipment.dto.RatingRequest;
import com.shipfast.shipment.dto.ShipmentListResponse;
import com.shipfast.shipment.dto.UpdateShipmentRequest;
import com.shipfast.shipment.dto.UpdateStatusRequest;
import com.shipfast.shipment.entity.Address;
import com.shipfast.shipment.entity.PricingConfig;
import com.shipfast.shipment.entity.Shipment;
import com.shipfast.shipment.entity.TrackingEvent;
import com.shipfast.shipment.repository.PricingConfigRepository;
import com.shipfast.shipment.repository.ShipmentRepository;
import com.shipfast.shipment.service.EmailService;
import com.shipfast.shipment.service.ShipmentService;

@Service
public class ShipmentServiceImpl implements ShipmentService {

    private static final String DEFAULT_PRICING_CONFIG_ID = "DEFAULT";
    private static final Pattern INDIA_PHONE_PATTERN = Pattern.compile("^\\+91\\d{10}$");
    private static final Pattern PINCODE_PATTERN = Pattern.compile("\\b\\d{6}\\b");
    private static final Map<String, List<String>> STATUS_TRANSITIONS = Map.of(
            "BOOKED", List.of("IN TRANSIT", "FAILED"),
            "IN TRANSIT", List.of("OUT FOR DELIVERY", "FAILED"),
            "OUT FOR DELIVERY", List.of("DELIVERED", "FAILED"),
            "FAILED", List.of("OUT FOR DELIVERY")
    );

    private final ShipmentRepository shipmentRepository;
    private final PricingConfigRepository pricingConfigRepository;
    private final EmailService emailService;
    private final InvoiceService invoiceService;
    private final MongoTemplate mongoTemplate;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${operations.service.url}")
    private String operationsServiceUrl;

    @Value("${communications.service.url}")
    private String communicationsServiceUrl;

    @Value("${auth.service.url}")
    private String authServiceUrl;

    private String operationsApiBaseUrl() {
        return appendPathIfMissing(operationsServiceUrl, "/api/operations");
    }

    private String authApiBaseUrl() {
        return appendPathIfMissing(authServiceUrl, "/api/auth");
    }

    private String communicationsBaseUrl() {
        return stripTrailingSlash(communicationsServiceUrl);
    }

    public ShipmentServiceImpl(ShipmentRepository shipmentRepository,
                               PricingConfigRepository pricingConfigRepository,
                               EmailService emailService,
                               InvoiceService invoiceService,
                               MongoTemplate mongoTemplate) {
        this.shipmentRepository = shipmentRepository;
        this.pricingConfigRepository = pricingConfigRepository;
        this.emailService = emailService;
        this.invoiceService = invoiceService;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Shipment createShipment(CreateShipmentRequest request) {
        normalizeAddress(request.getSender());
        normalizeAddress(request.getRecipient());
        validateCreateRequest(request);

        LocalDateTime now = LocalDateTime.now();
        String shipmentId = "SHP" + Math.abs(UUID.randomUUID().toString().hashCode()) + System.currentTimeMillis() % 1000;
        String trackingNumber = "SF" + System.currentTimeMillis();

        RateCalculationResponse rate = calculateRateFromInputs(
                request.getPackageDetails().getWeight(),
                request.getServiceType(),
                resolveAddressPincode(request.getSender()),
                resolveAddressPincode(request.getRecipient()),
                request.getPaymentMethod()
        );
        double finalCost = request.getQuotedCost() != null && request.getQuotedCost() > 0
                ? roundToRupee(request.getQuotedCost())
                : rate.getTotalCost();

        TrackingEvent initialEvent = TrackingEvent.builder()
                .status("Booked")
                .location("Origin Hub")
                .timestamp(now)
                .remarks("Shipment created.")
                .build();

        Shipment shipment = Shipment.builder()
                .id(shipmentId)
                .trackingNumber(trackingNumber)
            .customerId(request.getCustomerId())
            .branchId(request.getBranchId())
                .status("Booked")
                .serviceType(request.getServiceType())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(resolveInitialPaymentStatus(request.getPaymentMethod()))
                .cost(finalCost)
                .createdAt(now)
                .estimatedDelivery(now.plusDays(rate.getEstimatedDeliveryDays()))
                .updatedAt(now)
                .sender(request.getSender())
                .recipient(request.getRecipient())
                .packageDetails(request.getPackageDetails())
                .history(new ArrayList<>(List.of(initialEvent)))
                .build();

        populateSenderEmailFromCustomerIfMissing(shipment);
        return shipmentRepository.save(shipment);
    }

    @Override
    public ShipmentListResponse getAll(String status,
                                       String branchId,
                                       LocalDate dateFrom,
                                       LocalDate dateTo,
                                       Integer page,
                                       Integer limit) {
        boolean paginate = limit != null && limit > 0;
        int pageNumber = page == null || page < 1 ? 0 : page - 1;
        int pageSize = paginate ? limit : 2000; // Safety limit
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Query query = new Query().with(pageable);
        List<Criteria> criteria = new ArrayList<>();

        if (hasText(status)) {
            criteria.add(Criteria.where("status").is(status));
        }
        if (hasText(branchId)) {
            criteria.add(Criteria.where("branchId").is(branchId));
        }
        if (dateFrom != null) {
            criteria.add(Criteria.where("createdAt").gte(dateFrom.atStartOfDay()));
        }
        if (dateTo != null) {
            criteria.add(Criteria.where("createdAt").lte(dateTo.atTime(LocalTime.MAX)));
        }

        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }

        long count = mongoTemplate.count(query, Shipment.class);
        List<Shipment> shipments = mongoTemplate.find(query, Shipment.class);

        Page<Shipment> shipmentPage = new PageImpl<>(shipments, pageable, count);

        return ShipmentListResponse.builder()
                .data(shipmentPage.getContent())
                .pagination(ShipmentListResponse.Pagination.builder()
                        .totalItems(shipmentPage.getTotalElements())
                        .totalPages(shipmentPage.getTotalPages())
                        .currentPage(pageNumber + 1)
                        .build())
                .build();
    }

    @Override
    public List<Shipment> getMine(String customerId) {
        if (!hasText(customerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerId is required");
        }
        return shipmentRepository.findByCustomerIdOrSenderEmailOrderByCreatedAtDesc(customerId, customerId);
    }

    @Override
    public Shipment getByTrackingNumber(String trackingNumber) {
        return shipmentRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shipment not found"));
    }

    @Override
    public Shipment getById(String shipmentId) {
        if (!hasText(shipmentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shipmentId is required");
        }

        return shipmentRepository.findById(shipmentId)
                .or(() -> shipmentRepository.findByTrackingNumber(shipmentId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shipment not found"));
    }

    @Override
    public Shipment updateShipment(String shipmentId, UpdateShipmentRequest request) {
        Shipment shipment = getById(shipmentId);

        if (request.getSender() != null) {
            normalizeAddress(request.getSender());
            shipment.setSender(request.getSender());
        }
        if (request.getRecipient() != null) {
            normalizeAddress(request.getRecipient());
            shipment.setRecipient(request.getRecipient());
        }
        if (request.getPackageDetails() != null) {
            shipment.setPackageDetails(request.getPackageDetails());
        }
        if (hasText(request.getServiceType())) {
            shipment.setServiceType(request.getServiceType());
        }
        if (hasText(request.getPaymentMethod())) {
            shipment.setPaymentMethod(request.getPaymentMethod());
        }

        shipment.setUpdatedAt(LocalDateTime.now());
        return shipmentRepository.save(shipment);
    }

    @Override
    public void deleteShipment(String shipmentId) {
        Shipment shipment = getById(shipmentId);
        String databaseId = shipment.getId();
        String trackingNumber = shipment.getTrackingNumber();

        shipmentRepository.deleteById(databaseId);
        if (hasText(trackingNumber)) {
            shipmentRepository.deleteAllByTrackingNumber(trackingNumber);
        }

        boolean stillExistsById = hasText(databaseId) && shipmentRepository.findById(databaseId).isPresent();
        boolean stillExistsByTracking = hasText(trackingNumber) && shipmentRepository.findByTrackingNumber(trackingNumber).isPresent();
        if (stillExistsById || stillExistsByTracking) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to hard delete shipment");
        }
    }

    @Override
    public Shipment updateStatus(String shipmentId, UpdateStatusRequest request, String customerId) {
        Shipment shipment = getById(shipmentId);
        String nextStatus = normalizeStatus(request.getStatus());
        if (!hasText(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }

        String currentStatus = normalizeStatus(shipment.getStatus());
        boolean hasPaymentUpdate = hasText(request.getPaymentStatus()) || hasText(request.getPaymentCollectedAt());
        boolean sameStatusUpdate = hasText(currentStatus) && currentStatus.equalsIgnoreCase(nextStatus);
        if (sameStatusUpdate && !hasPaymentUpdate) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shipment is already " + currentStatus);
        }

        if (!sameStatusUpdate) {
            if ("Cancelled".equalsIgnoreCase(nextStatus) && hasText(customerId) && !customerId.equals(shipment.getCustomerId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can cancel only your own shipment");
            }
            if (!isAllowedStatusTransition(currentStatus, nextStatus)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, buildTransitionErrorMessage(currentStatus, nextStatus));
            }
            shipment.setStatus(nextStatus);
        }

        shipment.setUpdatedAt(LocalDateTime.now());
        if ("Delivered".equalsIgnoreCase(nextStatus)) {
            if (shipment.getDeliveredAt() == null) {
                shipment.setDeliveredAt(LocalDateTime.now());
            }
            if (hasText(request.getProofOfDeliveryImage())) {
                shipment.setProofOfDeliveryImage(request.getProofOfDeliveryImage());
            }
            if (hasText(request.getDeliveredBy())) {
                shipment.setDeliveredBy(request.getDeliveredBy());
            }
            if (hasText(request.getDeliveredByAgentId())) {
                shipment.setDeliveredByAgentId(request.getDeliveredByAgentId());
            } else if (hasText(shipment.getAssignedAgentId())) {
                shipment.setDeliveredByAgentId(shipment.getAssignedAgentId());
            } else if (hasText(customerId) && !customerId.equalsIgnoreCase(shipment.getCustomerId())) {
                shipment.setDeliveredByAgentId(customerId);
            }
            if (!hasText(shipment.getAssignedAgentId()) && hasText(shipment.getDeliveredByAgentId())) {
                shipment.setAssignedAgentId(shipment.getDeliveredByAgentId());
            }
            if (!hasText(request.getPaymentStatus())) {
                boolean codPayment = isCodPaymentMethod(shipment.getPaymentMethod());
                if (!codPayment) {
                    shipment.setPaymentStatus("SUCCESS");
                    if (shipment.getPaymentCollectedAt() == null) {
                        shipment.setPaymentCollectedAt(LocalDateTime.now());
                    }
                }
            }
        }
        if (hasText(request.getPaymentStatus())) {
            shipment.setPaymentStatus(normalizePaymentStatus(request.getPaymentStatus()));
        }
        if (hasText(request.getPaymentCollectedAt())) {
            try {
                shipment.setPaymentCollectedAt(LocalDateTime.parse(request.getPaymentCollectedAt().trim()));
            } catch (RuntimeException ignored) {
                // Keep status update successful even if incoming timestamp format is invalid.
            }
        }
        if ("SUCCESS".equalsIgnoreCase(shipment.getPaymentStatus()) && shipment.getPaymentCollectedAt() == null) {
            shipment.setPaymentCollectedAt(LocalDateTime.now());
        }

        TrackingEvent event = TrackingEvent.builder()
                .status(nextStatus)
                .location(hasText(request.getLocation()) ? request.getLocation() : "Hub Update")
                .timestamp(LocalDateTime.now())
                .remarks(hasText(request.getRemarks()) ? request.getRemarks() : "Status updated")
                .build();

        if (shipment.getHistory() == null) {
            shipment.setHistory(new ArrayList<>());
        }
        shipment.getHistory().add(event);

        Shipment saved = shipmentRepository.save(shipment);
        sendStatusNotification(saved, nextStatus, event.getRemarks());
        
        // Send status update email for all status changes (not just delivery)
        try {
            sendStatusUpdateEmail(saved, nextStatus);
        } catch (RuntimeException ignored) {
            // Status update is already saved; email failures can be retried separately.
        }
        
        if ("Delivered".equalsIgnoreCase(nextStatus)) {
            try {
                sendDeliveryEmail(saved);
            } catch (RuntimeException ignored) {
                // Delivery status is already saved; email failures can be retried separately.
            }
        }
        return saved;
    }

    @Override
    public Shipment assignShipment(String shipmentId, AssignShipmentRequest request) {
        Shipment shipment = getById(shipmentId);
        if (!hasText(request.getAgentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "agentId is required");
        }
        shipment.setAssignedAgentId(request.getAgentId());
        if (hasText(request.getRunSheetId())) {
            shipment.setRunSheetId(request.getRunSheetId().trim());
        }
        shipment.setUpdatedAt(LocalDateTime.now());
        return shipmentRepository.save(shipment);
    }

    @Override
    public Shipment addRating(String shipmentId, RatingRequest request) {
        Shipment shipment = getById(shipmentId);
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating must be between 1 and 5");
        }
        shipment.setRating(request.getRating());
        shipment.setRatingComment(request.getComment());
        shipment.setUpdatedAt(LocalDateTime.now());
        Shipment savedShipment = shipmentRepository.save(shipment);

        String agentIdentifier = hasText(savedShipment.getDeliveredByAgentId())
                ? savedShipment.getDeliveredByAgentId()
                : savedShipment.getAssignedAgentId();
        if (hasText(agentIdentifier)) {
            try {
                restTemplate.postForObject(
                        operationsApiBaseUrl() + "/agents/" + UriUtils.encodePathSegment(agentIdentifier, java.nio.charset.StandardCharsets.UTF_8) + "/rating",
                        Map.of("rating", request.getRating()),
                        Object.class
                );
            } catch (Exception ignored) {
                // keep shipment rating successful even if agent profile sync is temporarily unavailable
            }
        }

        return savedShipment;
    }

    @Override
    public RateCalculationResponse calculateRate(CalculateRateRequest request) {
        if (request.getWeight() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "weight must be greater than 0");
        }
        return calculateRateFromInputs(
                request.getWeight(),
                request.getServiceType(),
                request.getOriginPincode(),
                request.getDestinationPincode(),
                null);
    }

    @Override
    public PricingConfigDto getPricingConfig() {
        return toPricingConfigDto(getEffectivePricingConfig());
    }

    @Override
    public PricingConfigDto updatePricingConfig(PricingConfigDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pricing config payload is required");
        }

        PricingConfig existing = getEffectivePricingConfig();
        existing.setStandardRatePerKg(normalizePositiveValue(
                request.getStandardRatePerKg(),
                existing.getStandardRatePerKg(),
                "standardRatePerKg"));
        existing.setExpressMultiplier(normalizePositiveValue(
                request.getExpressMultiplier(),
                existing.getExpressMultiplier(),
                "expressMultiplier"));
        // Same-day pricing is always fixed as 2x Express.
        existing.setSameDayMultiplier(2.0);
        existing.setDistanceSurcharge(normalizeNonNegativeValue(
                request.getDistanceSurcharge(),
                existing.getDistanceSurcharge(),
                "distanceSurcharge"));
        existing.setFuelSurchargePct(normalizeNonNegativeValue(
                request.getFuelSurchargePct(),
                existing.getFuelSurchargePct(),
                "fuelSurchargePct"));
        existing.setGstPct(normalizeNonNegativeValue(
                request.getGstPct(),
                existing.getGstPct(),
                "gstPct"));
        existing.setCodHandlingFee(normalizeNonNegativeValue(
                request.getCodHandlingFee(),
                existing.getCodHandlingFee(),
                "codHandlingFee"));

        PricingConfig saved = pricingConfigRepository.save(existing);
        return toPricingConfigDto(saved);
    }

    private void sendStatusNotification(Shipment shipment, String status, String remarks) {
        if (shipment == null || !hasText(shipment.getCustomerId())) return;
        String message = "Shipment " + text(shipment.getTrackingNumber(), shipment.getId())
                + " status updated to " + normalizeStatus(status)
                + (hasText(remarks) ? ". " + remarks.trim() : ".");
        try {
            restTemplate.postForObject(
                    communicationsBaseUrl() + "/api/notifications/send?userId={userId}&type={type}&message={message}",
                    null,
                    Object.class,
                    shipment.getCustomerId(),
                    "IN_APP",
                    message
            );
        } catch (RestClientException ignored) {
            // Shipment status should remain successful even if the notification service is down.
        }
    }

    private void sendDeliveryEmail(Shipment shipment) {
        String senderEmail = resolveSenderEmail(shipment);
        if (!hasText(senderEmail)) return;

        String tracking = text(shipment.getTrackingNumber(), shipment.getId());
        String agentName = resolveAgentName(shipment);
        String body = String.join("\n",
                "Hello " + text(shipment.getSender() != null ? shipment.getSender().getName() : null, "Customer") + ",",
                "",
                "Your shipment " + tracking + " has been delivered successfully.",
                "",
                "Delivery details:",
                "Status: Delivered",
                "Delivered at: " + (shipment.getDeliveredAt() != null ? shipment.getDeliveredAt() : shipment.getUpdatedAt()),
                "Delivered by: " + text(shipment.getDeliveredBy(), agentName),
                "Agent ID: " + text(firstNonBlank(shipment.getDeliveredByAgentId(), shipment.getAssignedAgentId()), "-"),
                "Receiver: " + text(shipment.getRecipient() != null ? shipment.getRecipient().getName() : null, "-"),
                "Tracking ID: " + tracking,
                "",
                "The invoice image is attached. Proof of delivery is attached when available.",
                "Please give your feedback from the My Shipments page in your ShipFast dashboard.",
                "",
                "Regards,",
                "ShipFast Courier"
        );

        byte[] invoice = invoiceService.generateInvoice(shipment);
        emailService.sendEmail(
                senderEmail,
                "Shipment Status: Delivered - " + tracking,
                body,
                invoice,
                "Invoice-" + tracking + ".png",
                "image/png"
        );

        byte[] pod = decodeDataUrl(shipment.getProofOfDeliveryImage());
        if (pod != null && pod.length > 0) {
            emailService.sendEmail(
                    senderEmail,
                    "Proof of Delivery - " + tracking,
                    "Proof of delivery for shipment " + tracking + " is attached.",
                    pod,
                    "Proof-of-Delivery-" + tracking + podExtension(shipment.getProofOfDeliveryImage()),
                    podContentType(shipment.getProofOfDeliveryImage())
            );
        }
    }
    private void sendStatusUpdateEmail(Shipment shipment, String newStatus) {
        // Skip sending emails for already delivered status (handled separately)
        if ("Delivered".equalsIgnoreCase(newStatus)) {
            return;
        }
        
        String senderEmail = resolveSenderEmail(shipment);
        if (!hasText(senderEmail)) return;

        String tracking = text(shipment.getTrackingNumber(), shipment.getId());
        String statusText = normalizeStatus(newStatus);
        String formattedStatus = statusText.replace('_', ' ');
        
        String body = buildStatusUpdateEmailBody(shipment, formattedStatus, tracking);
        
        try {
            emailService.sendEmail(
                    senderEmail,
                    "Shipment Status Update: " + formattedStatus + " - " + tracking,
                    body,
                    null,
                    null,
                    null
            );
        } catch (RuntimeException ex) {
            // Log but don't fail - status update is already saved
            System.err.println("Failed to send status update email for shipment " + tracking + ": " + ex.getMessage());
        }
    }

    private String buildStatusUpdateEmailBody(Shipment shipment, String status, String tracking) {
        String senderName = text(shipment.getSender() != null ? shipment.getSender().getName() : null, "Customer");
        String receiverName = text(shipment.getRecipient() != null ? shipment.getRecipient().getName() : null, "Recipient");
        String agentName = resolveAgentName(shipment);
        String agentId = text(firstNonBlank(shipment.getDeliveredByAgentId(), shipment.getAssignedAgentId()), "-");
        
        StringBuilder body = new StringBuilder();
        body.append("Hello ").append(senderName).append(",\n");
        body.append("\n");
        body.append("Your shipment ").append(tracking).append(" has been updated.\n");
        body.append("\n");
        body.append("Update details:\n");
        body.append("Status: ").append(status).append("\n");
        body.append("Updated at: ").append(shipment.getUpdatedAt()).append("\n");
        body.append("Tracking ID: ").append(tracking).append("\n");
        body.append("Receiver: ").append(receiverName).append("\n");
        body.append("Service Type: ").append(text(shipment.getServiceType(), "-")).append("\n");
        body.append("Weight: ").append(shipment.getPackageDetails() != null ? 
            text(String.valueOf(shipment.getPackageDetails().getWeight()), "-") : "-").append(" kg\n");
        
        if (!"BOOKED".equalsIgnoreCase(status)) {
            body.append("Assigned Agent: ").append(agentName).append("\n");
            body.append("Agent ID: ").append(agentId).append("\n");
        }
        
        body.append("\n");
        body.append("You can track your shipment anytime from the My Shipments page in your ShipFast dashboard.\n");
        body.append("\n");
        body.append("Regards,\n");
        body.append("ShipFast Courier\n");
        
        return body.toString();
    }
    @SuppressWarnings("unchecked")
    private String resolveAgentName(Shipment shipment) {
        String agentIdentifier = firstNonBlank(shipment.getDeliveredByAgentId(), shipment.getAssignedAgentId());
        if (!hasText(agentIdentifier)) return "Assigned Agent";
        try {
            Map<String, Object> agent = restTemplate.getForObject(
                    operationsApiBaseUrl() + "/agents/"
                            + UriUtils.encodePathSegment(agentIdentifier, java.nio.charset.StandardCharsets.UTF_8),
                    Map.class
            );
            if (agent != null) {
                return firstNonBlank(
                        asText(agent.get("name")),
                        asText(agent.get("fullName")),
                        asText(agent.get("userId")),
                        asText(agent.get("agentId")),
                        agentIdentifier
                );
            }
        } catch (RestClientException ignored) {
            // Keep delivery mail available even if operations service cannot be reached.
        }
        return agentIdentifier;
    }

    private String resolveSenderEmail(Shipment shipment) {
        if (shipment == null) return null;
        String senderEmail = shipment.getSender() != null ? shipment.getSender().getEmail() : null;
        if (hasText(senderEmail)) return senderEmail.trim();

        String resolved = lookupUserEmail(shipment.getCustomerId());
        if (hasText(resolved) && shipment.getSender() != null) {
            shipment.getSender().setEmail(resolved.trim());
            try {
                shipmentRepository.save(shipment);
            } catch (RuntimeException ignored) {
                // best-effort backfill
            }
        }
        return resolved;
    }

    @SuppressWarnings("unchecked")
    private String lookupUserEmail(String emailOrId) {
        if (!hasText(emailOrId)) return null;
        try {
            Map<String, Object> response = restTemplate.getForObject(
                    authApiBaseUrl() + "/internal/users/"
                            + UriUtils.encodePathSegment(emailOrId, java.nio.charset.StandardCharsets.UTF_8),
                    Map.class
            );
            if (response == null) return null;
            Object data = response.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                Object email = dataMap.get("email");
                return email != null ? String.valueOf(email) : null;
            }
            Object email = response.get("email");
            return email != null ? String.valueOf(email) : null;
        } catch (RestClientException ignored) {
            return null;
        }
    }

    private void populateSenderEmailFromCustomerIfMissing(Shipment shipment) {
        if (shipment == null || shipment.getSender() == null || hasText(shipment.getSender().getEmail())) return;
        String email = lookupUserEmail(shipment.getCustomerId());
        if (hasText(email)) {
            shipment.getSender().setEmail(email.trim());
        }
    }

    private byte[] decodeDataUrl(String value) {
        if (!hasText(value)) return null;
        String raw = value.trim();
        int comma = raw.indexOf(',');
        String base64 = comma >= 0 ? raw.substring(comma + 1) : raw;
        try {
            return Base64.getMimeDecoder().decode(base64);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String podContentType(String dataUrl) {
        if (hasText(dataUrl) && dataUrl.startsWith("data:image/png")) return "image/png";
        return "image/jpeg";
    }

    private String podExtension(String dataUrl) {
        return "image/png".equals(podContentType(dataUrl)) ? ".png" : ".jpg";
    }

    private RateCalculationResponse calculateRateFromInputs(double weight,
                                                            String serviceType,
                                                            String originPincode,
                                                            String destinationPincode,
                                                            String paymentMethod) {
        PricingConfig pricing = getEffectivePricingConfig();
        String normalizedServiceType = normalizeServiceType(serviceType);
        double baseRate = Math.max(weight, 0) * pricing.getStandardRatePerKg();

        if (hasText(originPincode) && hasText(destinationPincode)) {
            if (!originPincode.substring(0, Math.min(2, originPincode.length()))
                    .equals(destinationPincode.substring(0, Math.min(2, destinationPincode.length())))) {
                baseRate += pricing.getDistanceSurcharge();
            }
        }

        if ("EXPRESS".equals(normalizedServiceType)) {
            baseRate *= pricing.getExpressMultiplier();
        } else if ("SAME_DAY".equals(normalizedServiceType)) {
            baseRate *= (pricing.getExpressMultiplier() * pricing.getSameDayMultiplier());
        }

        double fuelSurcharge = (baseRate * pricing.getFuelSurchargePct()) / 100.0;
        double gst = (baseRate * pricing.getGstPct()) / 100.0;
        double codHandlingFee = isCodPaymentMethod(paymentMethod) ? pricing.getCodHandlingFee() : 0.0;
        double total = baseRate + fuelSurcharge + gst + codHandlingFee;

        int etaDays = switch (normalizedServiceType) {
            case "SAME_DAY" -> 1;
            case "EXPRESS" -> 2;
            default -> 4;
        };

        return RateCalculationResponse.builder()
                .baseRate(roundToRupee(baseRate))
                .fuelSurcharge(roundToRupee(fuelSurcharge))
                .gst(roundToRupee(gst))
                .totalCost(roundToRupee(total))
                .estimatedDeliveryDays(etaDays)
                .build();
    }

    private void validateCreateRequest(CreateShipmentRequest request) {
        if (request == null || request.getSender() == null || request.getRecipient() == null || request.getPackageDetails() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sender, recipient and packageDetails are required");
        }
        if (request.getPackageDetails().getWeight() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "packageDetails.weight must be greater than 0");
        }
        if (!hasText(request.getServiceType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "serviceType is required");
        }
        if (!hasText(request.getPaymentMethod())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "paymentMethod is required");
        }
        if (request.getQuotedCost() != null && request.getQuotedCost() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "quotedCost cannot be negative");
        }
        validateAddress("sender", request.getSender());
        validateAddress("recipient", request.getRecipient());

        String senderPhone = request.getSender().getPhone().trim();
        String recipientPhone = request.getRecipient().getPhone().trim();
        if (senderPhone.equals(recipientPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sender and recipient phone numbers cannot be the same");
        }

        String senderAddress = normalizeComparableValue(composeFullAddressLine(request.getSender()));
        String recipientAddress = normalizeComparableValue(composeFullAddressLine(request.getRecipient()));
        if (senderAddress.equals(recipientAddress)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sender and recipient addresses cannot be the same");
        }
    }

    private String extractPincode(String address) {
        if (!hasText(address)) {
            return null;
        }
        String[] parts = address.split(",");
        for (int index = parts.length - 1; index >= 0; index--) {
            String candidate = parts[index].trim();
            if (PINCODE_PATTERN.matcher(candidate).find()) {
                return candidate.replaceAll("[^0-9]", "").substring(0, 6);
            }
            String digits = candidate.replaceAll("[^0-9]", "");
            if (digits.length() >= 6) {
                return digits.substring(digits.length() - 6);
            }
        }

        String allDigits = address.replaceAll("[^0-9]", "");
        if (allDigits.length() >= 6) {
            return allDigits.substring(allDigits.length() - 6);
        }
        return null;
    }

    private PricingConfig getEffectivePricingConfig() {
        return pricingConfigRepository.findById(DEFAULT_PRICING_CONFIG_ID)
                .orElseGet(() -> pricingConfigRepository.save(defaultPricingConfig()));
    }

    private PricingConfig defaultPricingConfig() {
        return PricingConfig.builder()
                .id(DEFAULT_PRICING_CONFIG_ID)
                .standardRatePerKg(80.0)
                .expressMultiplier(1.75)
                .sameDayMultiplier(2.0)
                .distanceSurcharge(40.0)
                .fuelSurchargePct(9.0)
                .gstPct(5.0)
                .codHandlingFee(50.0)
                .build();
    }

    private PricingConfigDto toPricingConfigDto(PricingConfig config) {
        return PricingConfigDto.builder()
                .standardRatePerKg(config.getStandardRatePerKg())
                .expressMultiplier(config.getExpressMultiplier())
                .sameDayMultiplier(config.getSameDayMultiplier())
                .distanceSurcharge(config.getDistanceSurcharge())
                .fuelSurchargePct(config.getFuelSurchargePct())
                .gstPct(config.getGstPct())
                .codHandlingFee(config.getCodHandlingFee())
                .build();
    }

    private void validateAddress(String label, Address address) {
        if (address == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " details are required");
        }
        normalizeAddress(address);
        if (!hasText(address.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".name is required");
        }
        if (!hasText(address.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".phone is required");
        }
        String normalizedPhone = address.getPhone().trim();
        if (!INDIA_PHONE_PATTERN.matcher(normalizedPhone).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".phone must be in +91XXXXXXXXXX format");
        }
        if (!hasText(address.getDoorAddress())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".doorAddress is required");
        }
        if (!hasText(address.getCity())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".city is required");
        }
        if (!hasText(address.getState())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".state is required");
        }
        if (!hasText(address.getPincode()) || !address.getPincode().trim().matches("\\d{6}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + ".pincode must be a valid 6-digit number");
        }
    }

    private void normalizeAddress(Address address) {
        if (address == null) return;

        String doorAddress = safeTrim(address.getDoorAddress());
        String city = safeTrim(address.getCity());
        String state = safeTrim(address.getState());
        String pincode = safeTrim(address.getPincode());
        String legacyAddress = safeTrim(address.getAddress());

        if ((!hasText(doorAddress) || !hasText(city) || !hasText(state) || !hasText(pincode)) && hasText(legacyAddress)) {
            String[] parts = legacyAddress.split(",");
            if (!hasText(doorAddress) && parts.length >= 1) {
                doorAddress = safeTrim(parts[0]);
            }
            if (!hasText(city) && parts.length >= 2) {
                city = safeTrim(parts[parts.length - 3 >= 1 ? parts.length - 3 : 1]);
            }
            if (!hasText(state) && parts.length >= 3) {
                state = safeTrim(parts[parts.length - 2]);
            }
            if (!hasText(pincode)) {
                pincode = extractPincode(legacyAddress);
            }
        }

        address.setDoorAddress(doorAddress);
        address.setCity(city);
        address.setState(state);
        address.setPincode(pincode);
        address.setAddress(composeFullAddressLine(address));
    }

    private String composeFullAddressLine(Address address) {
        if (address == null) return "";
        return String.join(", ",
                List.of(
                        safeTrim(address.getDoorAddress()),
                        safeTrim(address.getCity()),
                        safeTrim(address.getState()),
                        safeTrim(address.getPincode())
                ).stream().filter(this::hasText).toList()
        );
    }

    private String resolveAddressPincode(Address address) {
        String pincode = safeTrim(address != null ? address.getPincode() : null);
        if (hasText(pincode) && pincode.matches("\\d{6}")) {
            return pincode;
        }
        return extractPincode(address != null ? address.getAddress() : null);
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeComparableValue(String value) {
        return (value == null ? "" : value)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private boolean isCodPaymentMethod(String paymentMethod) {
        if (!hasText(paymentMethod)) return false;
        String normalized = paymentMethod.trim().toUpperCase(Locale.ROOT);
        return "COD".equals(normalized) || "CASH".equals(normalized);
    }

    private String normalizeServiceType(String serviceType) {
        String normalized = String.valueOf(serviceType)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace("-", " ")
                .replace("_", " ");
        if ("express".equals(normalized)) return "EXPRESS";
        if ("same day".equals(normalized) || "sameday".equals(normalized)) return "SAME_DAY";
        return "STANDARD";
    }

    private double normalizePositiveValue(Double input, double fallback, String fieldName) {
        if (input == null) return fallback;
        if (!Double.isFinite(input) || input <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be greater than 0");
        }
        return input;
    }

    private double normalizeNonNegativeValue(Double input, double fallback, String fieldName) {
        if (input == null) return fallback;
        if (!Double.isFinite(input) || input < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " cannot be negative");
        }
        return input;
    }

    private double roundToRupee(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return (double) Math.round(value);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String text(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private String asText(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (hasText(value)) return value.trim();
        }
        return null;
    }

    private String resolveInitialPaymentStatus(String paymentMethod) {
        if ("COD".equalsIgnoreCase(paymentMethod) || "CASH".equalsIgnoreCase(paymentMethod)) {
            return "PENDING";
        }
        return "SUCCESS";
    }

    private String normalizePaymentStatus(String paymentStatus) {
        if (!hasText(paymentStatus)) return paymentStatus;
        String normalized = paymentStatus.trim().toUpperCase();
        if ("PAID".equals(normalized) || "COMPLETED".equals(normalized)) {
            return "SUCCESS";
        }
        return normalized;
    }

    private String normalizeStatus(String status) {
        if (!hasText(status)) return status;
        String sanitized = status.replace('_', ' ').trim().toLowerCase();
        String[] words = sanitized.split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            if (words[i].isEmpty()) continue;
            builder.append(Character.toUpperCase(words[i].charAt(0)))
                    .append(words[i].substring(1));
            if (i < words.length - 1) builder.append(" ");
        }
        return builder.toString();
    }

    private boolean isAllowedStatusTransition(String currentStatus, String nextStatus) {
        String current = canonicalStatus(currentStatus);
        String next = canonicalStatus(nextStatus);
        if (!hasText(next)) return false;
        if (!hasText(current)) return true;

        if ("CANCELLED".equals(next)) {
            return !"DELIVERED".equals(current) && !"CANCELLED".equals(current);
        }

        if ("CANCELLED".equals(current) || "DELIVERED".equals(current)) {
            return false;
        }

        List<String> allowed = STATUS_TRANSITIONS.getOrDefault(current, List.of());
        return allowed.contains(next);
    }

    private String buildTransitionErrorMessage(String currentStatus, String nextStatus) {
        String current = canonicalStatus(currentStatus);
        String next = canonicalStatus(nextStatus);
        if (!hasText(current)) {
            return "Invalid status transition";
        }
        if ("CANCELLED".equals(current) || "DELIVERED".equals(current)) {
            return "Cannot update shipment from " + currentStatus;
        }
        List<String> allowed = STATUS_TRANSITIONS.getOrDefault(current, List.of());
        if (allowed.isEmpty()) {
            return "Invalid status transition from " + currentStatus + " to " + nextStatus;
        }
        return "Invalid status transition from " + currentStatus + " to " + nextStatus + ". Allowed: " + String.join(", ", allowed);
    }

    private String canonicalStatus(String status) {
        if (!hasText(status)) return "";
        return normalizeStatus(status).toUpperCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private String appendPathIfMissing(String baseUrl, String path) {
        String normalizedBase = stripTrailingSlash(baseUrl);
        if (normalizedBase.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Required service URL is not configured");
        }
        return normalizedBase.endsWith(path) ? normalizedBase : normalizedBase + path;
    }

    private String stripTrailingSlash(String value) {
        return value == null ? "" : value.replaceAll("/+$", "").trim();
    }
}
