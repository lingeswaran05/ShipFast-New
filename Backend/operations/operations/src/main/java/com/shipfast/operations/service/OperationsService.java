package com.shipfast.operations.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.shipfast.operations.dto.AgentProfileRequest;
import com.shipfast.operations.dto.AgentProfileResponse;
import com.shipfast.operations.dto.AgentRatingRequest;
import com.shipfast.operations.dto.AgentRequest;
import com.shipfast.operations.dto.AgentResponse;
import com.shipfast.operations.dto.AgentVerificationRequest;
import com.shipfast.operations.dto.CashCollectionRequest;
import com.shipfast.operations.dto.CashCollectionResponse;
import com.shipfast.operations.dto.InvoiceRequest;
import com.shipfast.operations.dto.InvoiceResponse;
import com.shipfast.operations.dto.RunSheetRequest;
import com.shipfast.operations.dto.RunSheetResponse;
import com.shipfast.operations.dto.ScanRequest;
import com.shipfast.operations.entity.AgentAvailability;
import com.shipfast.operations.entity.AgentProfile;
import com.shipfast.operations.entity.CashCollection;
import com.shipfast.operations.entity.DeliveryScan;
import com.shipfast.operations.entity.Invoice;
import com.shipfast.operations.entity.RunSheet;
import com.shipfast.operations.repository.AgentRepository;
import com.shipfast.operations.repository.CashCollectionRepository;
import com.shipfast.operations.repository.DeliveryScanRepository;
import com.shipfast.operations.repository.InvoiceRepository;
import com.shipfast.operations.repository.RunSheetRepository;

@Service
public class OperationsService {

    private final AgentRepository agentRepo;
    private final RunSheetRepository runSheetRepo;
    private final DeliveryScanRepository scanRepo;
    private final CashCollectionRepository cashRepo;
    private final InvoiceRepository invoiceRepo;
    private final RestTemplate restTemplate;

    @Value("${shipment.service.url}")
    private String shipmentServiceUrl;

    public OperationsService(AgentRepository agentRepo,
                             RunSheetRepository runSheetRepo,
                             DeliveryScanRepository scanRepo,
                             CashCollectionRepository cashRepo,
                             InvoiceRepository invoiceRepo,
                             RestTemplate restTemplate) {
        this.agentRepo = agentRepo;
        this.runSheetRepo = runSheetRepo;
        this.scanRepo = scanRepo;
        this.cashRepo = cashRepo;
        this.invoiceRepo = invoiceRepo;
        this.restTemplate = restTemplate;
    }

    private String shipmentApiBaseUrl() {
        return appendPathIfMissing(shipmentServiceUrl, "/api/v1/shipments");
    }



    public AgentResponse createAgent(AgentRequest request) {
        AgentProfile agent = new AgentProfile();
        agent.setAgentId("AG-" + UUID.randomUUID().toString().substring(0, 6));
        agent.setUserId(request.getUserId());
        agent.setLicenseNumber(request.getLicenseNumber());
        agent.setVehicleNumber(request.getVehicleNumber());
        agent.setRcBookNumber(request.getRcBookNumber());
        agent.setAadharNumber(request.getAadharNumber());
        agent.setBloodType(request.getBloodType());
        agent.setOrganDonor(Boolean.FALSE);
        agent.setShiftTiming(request.getShiftTiming());
        agent.setJoinDate(LocalDateTime.now());
        agent.setUpdatedAt(LocalDateTime.now());
        agent.setVerificationStatus("PENDING");
        agent.setSuccessRate(100.0);
        agent.setAverageRating(0.0);
        agent.setTotalRatings(0L);
        agent.setAvailabilityStatus("OFFLINE");
        agent.setDeliveredCount(0L);
        agent.setFailedCount(0L);
        agent.setInTransitCount(0L);

        agentRepo.save(Objects.requireNonNull(agent));

        return mapToAgentResponse(agent);
    }

    public List<AgentResponse> getAllAgents() {

        return agentRepo.findAll()
                .stream()
            .filter(this::isEligibleForAssignment)
                .map(this::mapToAgentResponse)
                .toList();
    }

    private boolean isEligibleForAssignment(AgentProfile agent) {
        if (agent == null) return false;
        String verification = String.valueOf(agent.getVerificationStatus() == null ? "" : agent.getVerificationStatus()).trim().toUpperCase();
        if ("REJECTED".equals(verification)) return false;

        String availability = String.valueOf(agent.getAvailabilityStatus() == null ? "" : agent.getAvailabilityStatus()).trim().toUpperCase();
        try {
            AgentAvailability status = AgentAvailability.valueOf(availability);
            return status.isEligibleForAssignment();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private AgentResponse mapToAgentResponse(AgentProfile agent) {
        AgentResponse response = new AgentResponse();
        response.setAgentId(agent.getAgentId());
        response.setUserId(agent.getUserId());
        response.setAvailabilityStatus(agent.getAvailabilityStatus() != null ? agent.getAvailabilityStatus().toUpperCase() : "OFFLINE");
        response.setVerificationStatus(agent.getVerificationStatus() != null ? agent.getVerificationStatus().toUpperCase() : "PENDING");
        response.setShiftTiming(agent.getShiftTiming());
        response.setSuccessRate(agent.getSuccessRate());
        response.setAverageRating(agent.getAverageRating());
        response.setTotalRatings(agent.getTotalRatings());
        response.setJoinDate(agent.getJoinDate());
        return response;
    }

    public AgentProfileResponse getAgentProfileByUserId(String userId) {
        AgentProfile profile = agentRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Agent profile not found"));
        return mapToAgentProfileResponse(profile);
    }

    public AgentProfileResponse getAgentProfileByIdentifier(String agentIdentifier) {
        AgentProfile profile = resolveAgentProfile(agentIdentifier);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent profile not found");
        }
        return mapToAgentProfileResponse(profile);
    }

    /**
     * Returns the current agent request status for the given userId from the DB.
     * Possible values: "PENDING", "VERIFIED", "REJECTED", "CANCELLED", "NONE" (no profile found).
     */
    public java.util.Map<String, String> checkAgentRequestStatus(String userId) {
        return agentRepo.findByUserId(userId)
                .map(profile -> {
                    String status = profile.getVerificationStatus();
                    String normalized = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : "PENDING";
                    boolean hasPending = "PENDING".equals(normalized) || "PENDING_VERIFICATION".equals(normalized);
                    return java.util.Map.of("status", normalized, "hasPending", hasPending ? "true" : "false");
                })
                .orElse(java.util.Map.of("status", "NONE", "hasPending", "false"));
    }

    public AgentProfileResponse upsertAgentProfile(String userId, AgentProfileRequest request) {
        AgentProfile existing = agentRepo.findByUserId(userId).orElse(null);

        // Block re-submission if there is already a PENDING request in DB
        if (existing != null) {
            String currentStatus = existing.getVerificationStatus();
            boolean isCurrentlyPending = currentStatus != null && "PENDING".equalsIgnoreCase(currentStatus.trim());
            // Allow upsert only if request contains non-agent-request fields (e.g., availabilityStatus update by an agent)
            boolean isAgentRequestPayload = request.getLicenseNumber() != null
                    || request.getAadharNumber() != null
                    || request.getVehicleNumber() != null
                    || request.getRcBookNumber() != null
                    || request.getProfileImage() != null
                    || request.getAadharCopy() != null
                    || request.getLicenseCopy() != null
                    || request.getRcBookCopy() != null;
            // A pending agent request can be edited by the same user/admin flow.
            // Keep the existing profile and merge the latest documents/details below.
        }

        AgentProfile profile = existing != null ? existing : new AgentProfile();
        if (existing == null) {
            profile.setAgentId("AG-" + UUID.randomUUID().toString().substring(0, 6));
            profile.setUserId(userId);
            profile.setJoinDate(LocalDateTime.now());
            profile.setVerificationStatus("PENDING");
            profile.setSuccessRate(100.0);
            profile.setAverageRating(0.0);
            profile.setTotalRatings(0L);
            profile.setAvailabilityStatus("OFFLINE");
            profile.setDeliveredCount(0L);
            profile.setFailedCount(0L);
            profile.setInTransitCount(0L);
        }

        if (request.getLicenseNumber() != null) profile.setLicenseNumber(request.getLicenseNumber());
        if (request.getAadharNumber() != null) profile.setAadharNumber(request.getAadharNumber());
        if (request.getVehicleNumber() != null) profile.setVehicleNumber(request.getVehicleNumber());
        if (request.getRcBookNumber() != null) profile.setRcBookNumber(request.getRcBookNumber());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getOrganDonor() != null) profile.setOrganDonor(request.getOrganDonor());
        if (request.getShiftTiming() != null) profile.setShiftTiming(request.getShiftTiming());
        if (request.getProfileImage() != null) profile.setProfileImage(request.getProfileImage());
        if (request.getAadharCopy() != null) profile.setAadharCopy(request.getAadharCopy());
        if (request.getLicenseCopy() != null) profile.setLicenseCopy(request.getLicenseCopy());
        if (request.getRcBookCopy() != null) profile.setRcBookCopy(request.getRcBookCopy());
        if (request.getVerificationStatus() != null) profile.setVerificationStatus(request.getVerificationStatus().toUpperCase());
        if (request.getVerifiedBy() != null) profile.setVerifiedBy(request.getVerifiedBy());
        if (request.getVerificationNotes() != null) profile.setVerificationNotes(request.getVerificationNotes());
        if (request.getAvailabilityStatus() != null) profile.setAvailabilityStatus(request.getAvailabilityStatus().toUpperCase());
        if (request.getDeliveredCount() != null) profile.setDeliveredCount(Math.max(0L, request.getDeliveredCount()));
        if (request.getFailedCount() != null) profile.setFailedCount(Math.max(0L, request.getFailedCount()));
        if (request.getInTransitCount() != null) profile.setInTransitCount(Math.max(0L, request.getInTransitCount()));
        if (profile.getAverageRating() == null) profile.setAverageRating(0.0);
        if (profile.getTotalRatings() == null) profile.setTotalRatings(0L);
        if (profile.getAvailabilityStatus() == null || profile.getAvailabilityStatus().isBlank()) profile.setAvailabilityStatus("OFFLINE");
        if (profile.getDeliveredCount() == null) profile.setDeliveredCount(0L);
        if (profile.getFailedCount() == null) profile.setFailedCount(0L);
        if (profile.getInTransitCount() == null) profile.setInTransitCount(0L);
        profile.setUpdatedAt(LocalDateTime.now());
        if ("VERIFIED".equalsIgnoreCase(profile.getVerificationStatus())) {
            profile.setVerifiedAt(LocalDateTime.now());
        }

        agentRepo.save(Objects.requireNonNull(profile));
        return mapToAgentProfileResponse(profile);
    }

    public AgentProfileResponse verifyAgentProfile(String userId, AgentVerificationRequest request) {
        AgentProfile profile = agentRepo.findByUserId(userId)
            .orElseGet(() -> {
                AgentProfile created = new AgentProfile();
                created.setAgentId("AG-" + UUID.randomUUID().toString().substring(0, 6));
                created.setUserId(userId);
                created.setJoinDate(LocalDateTime.now());
                created.setVerificationStatus("PENDING");
                created.setSuccessRate(100.0);
                created.setAverageRating(0.0);
                created.setTotalRatings(0L);
                created.setAvailabilityStatus("OFFLINE");
                created.setDeliveredCount(0L);
                created.setFailedCount(0L);
                created.setInTransitCount(0L);
                return created;
            });

        // If an explicit status override is supplied (e.g., "CANCELLED"), use it directly.
        String explicitStatus = request != null && request.getVerificationStatus() != null
                ? request.getVerificationStatus().trim().toUpperCase()
                : null;
        if (explicitStatus != null && !explicitStatus.isBlank()) {
            profile.setVerificationStatus(explicitStatus);
        } else {
            boolean verified = request != null && request.getVerified() != null && request.getVerified();
            profile.setVerificationStatus(verified ? "VERIFIED" : "REJECTED");
        }
        profile.setVerifiedBy(request != null ? request.getVerifiedBy() : null);
        profile.setVerificationNotes(request != null ? request.getVerificationNotes() : null);
        profile.setUpdatedAt(LocalDateTime.now());
        profile.setVerifiedAt(LocalDateTime.now());
        if (profile.getAverageRating() == null) profile.setAverageRating(0.0);
        if (profile.getTotalRatings() == null) profile.setTotalRatings(0L);
        if (profile.getAvailabilityStatus() == null || profile.getAvailabilityStatus().isBlank()) profile.setAvailabilityStatus("OFFLINE");
        if (profile.getDeliveredCount() == null) profile.setDeliveredCount(0L);
        if (profile.getFailedCount() == null) profile.setFailedCount(0L);
        if (profile.getInTransitCount() == null) profile.setInTransitCount(0L);

        agentRepo.save(Objects.requireNonNull(profile));
        return mapToAgentProfileResponse(profile);
    }

    public void deleteAgentProfile(String userIdOrAgentId) {
        if (userIdOrAgentId == null || userIdOrAgentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent user id is required");
        }

        boolean removed = false;
        AgentProfile byUserId = agentRepo.findByUserId(userIdOrAgentId).orElse(null);
        if (byUserId != null) {
            agentRepo.delete(byUserId);
            removed = true;
        }

        if (agentRepo.existsById(userIdOrAgentId)) {
            agentRepo.deleteById(userIdOrAgentId);
            removed = true;
        }

        if (!removed) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent profile not found");
        }
    }

    public AgentProfileResponse recordAgentRating(String agentIdentifier, AgentRatingRequest request) {
        if (request == null || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
        }

        AgentProfile profile = resolveAgentProfile(agentIdentifier);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent profile not found");
        }

        Double averageRating = profile.getAverageRating();
        Long totalRatings = profile.getTotalRatings();
        double currentAverage = averageRating != null ? averageRating.doubleValue() : 0.0;
        long currentCount = totalRatings != null ? totalRatings.longValue() : 0L;
        long nextCount = currentCount + 1L;
        double nextAverage = ((currentAverage * currentCount) + request.getRating()) / nextCount;

        profile.setAverageRating(Math.round(nextAverage * 100.0) / 100.0);
        profile.setTotalRatings(nextCount);
        profile.setUpdatedAt(LocalDateTime.now());
        agentRepo.save(Objects.requireNonNull(profile));
        return mapToAgentProfileResponse(profile);
    }

    private AgentProfileResponse mapToAgentProfileResponse(AgentProfile profile) {
        AgentProfileResponse response = new AgentProfileResponse();
        response.setAgentId(profile.getAgentId());
        response.setUserId(profile.getUserId());
        response.setLicenseNumber(profile.getLicenseNumber());
        response.setVehicleNumber(profile.getVehicleNumber());
        response.setRcBookNumber(profile.getRcBookNumber());
        response.setBloodType(profile.getBloodType());
        response.setOrganDonor(profile.getOrganDonor());
        response.setShiftTiming(profile.getShiftTiming());
        response.setSuccessRate(profile.getSuccessRate());
        response.setJoinDate(profile.getJoinDate());
        response.setUpdatedAt(profile.getUpdatedAt());
        response.setVerificationStatus(profile.getVerificationStatus());
        response.setVerifiedBy(profile.getVerifiedBy());
        response.setVerifiedAt(profile.getVerifiedAt());
        response.setVerificationNotes(profile.getVerificationNotes());
        response.setAverageRating(profile.getAverageRating() != null ? profile.getAverageRating().doubleValue() : 0.0);
        response.setTotalRatings(profile.getTotalRatings() != null ? profile.getTotalRatings().longValue() : 0L);
        response.setProfileImage(profile.getProfileImage());
        response.setAadharCopy(profile.getAadharCopy());
        response.setLicenseCopy(profile.getLicenseCopy());
        response.setRcBookCopy(profile.getRcBookCopy());
        response.setAvailabilityStatus(profile.getAvailabilityStatus() != null ? profile.getAvailabilityStatus() : "OFFLINE");
        response.setDeliveredCount(profile.getDeliveredCount() != null ? profile.getDeliveredCount() : 0L);
        response.setFailedCount(profile.getFailedCount() != null ? profile.getFailedCount() : 0L);
        response.setInTransitCount(profile.getInTransitCount() != null ? profile.getInTransitCount() : 0L);
        return response;
    }

    private AgentProfile resolveAgentProfile(String agentIdentifier) {
        if (agentIdentifier == null || agentIdentifier.isBlank()) return null;
        return agentRepo.findById(agentIdentifier)
                .or(() -> agentRepo.findByUserId(agentIdentifier))
                .orElse(null);
    }

    public RunSheetResponse createRunSheet(RunSheetRequest request) {
        agentRepo.findById(request.getAgentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent not found"));

        RunSheet runSheet = new RunSheet();
        runSheet.setRunSheetId("RS-" + UUID.randomUUID().toString().substring(0, 6));
        runSheet.setAgentId(request.getAgentId());
        runSheet.setHubId(request.getHubId());
        runSheet.setDate(LocalDate.now());
        runSheet.setShipmentIds(request.getShipmentTrackingNumbers());
        runSheet.setCreatedAt(LocalDateTime.now());
        runSheet.setUpdatedAt(LocalDateTime.now());

        runSheetRepo.save(Objects.requireNonNull(runSheet));
        if (request.getShipmentTrackingNumbers() != null) {
            for (String shipmentId : request.getShipmentTrackingNumbers()) {
                try {
                    restTemplate.postForObject(
                        shipmentApiBaseUrl() + "/" + shipmentId + "/assign",
                            java.util.Map.of("agentId", request.getAgentId()),
                            Object.class
                    );
                } catch (RestClientException ignored) {
                    // keep run-sheet creation non-blocking even if assignment API fails for some ids
                }
            }
        }

        RunSheetResponse response = new RunSheetResponse();
        response.setRunSheetId(runSheet.getRunSheetId());
        response.setAgentId(runSheet.getAgentId());
        response.setHubId(runSheet.getHubId());
        response.setDate(runSheet.getDate());
        response.setShipmentTrackingNumbers(runSheet.getShipmentIds());
        return response;
    }

    public List<RunSheetResponse> getRunSheetsByAgent(String agentId) {

        return runSheetRepo.findByAgentId(agentId)
                .stream()
                .map(rs -> {
                    RunSheetResponse response = new RunSheetResponse();
                    response.setRunSheetId(rs.getRunSheetId());
                    response.setAgentId(rs.getAgentId());
                    response.setHubId(rs.getHubId());
                    response.setDate(rs.getDate());
                    response.setShipmentTrackingNumbers(rs.getShipmentIds());
                    return response;
                })
                .toList();
    }

    public void scanShipment(ScanRequest request) {
        agentRepo.findById(request.getAgentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent not found"));

        try {
            restTemplate.patchForObject(
                shipmentApiBaseUrl() + "/" +
                        request.getShipmentTrackingNumber() +
                        "/status",
                    java.util.Map.of("status", request.getStatus(), "remarks", "Updated from scan operation"),
                    Object.class
            );
        } catch (RestClientException ignored) {
            // scan should still be recorded even if status call fails
        }

        DeliveryScan scan = new DeliveryScan();
        scan.setScanId(UUID.randomUUID().toString());
        scan.setShipmentId(request.getShipmentTrackingNumber());
        scan.setAgentId(request.getAgentId());
        scan.setStatus(request.getStatus());
        scan.setCreatedAt(LocalDateTime.now());
        scan.setUpdatedAt(LocalDateTime.now());
        scan.setRemarks("Scanned by agent");

        scanRepo.save(Objects.requireNonNull(scan));
    }



    public CashCollectionResponse recordCash(CashCollectionRequest request) {

        double total = request.getCodAmount()
                + request.getUpiAmount()
                + request.getCardAmount();

        CashCollection collection = new CashCollection();
        collection.setCollectionId("CC-" + UUID.randomUUID().toString().substring(0, 6));
        collection.setShipmentId(request.getShipmentTrackingNumber());
        collection.setCodAmount(request.getCodAmount());
        collection.setUpiAmount(request.getUpiAmount());
        collection.setCardAmount(request.getCardAmount());
        collection.setTotalAmount(total);
        collection.setVerified(false);
        collection.setDepositedToBank(false);
        collection.setCreatedAt(LocalDateTime.now());
        collection.setUpdatedAt(LocalDateTime.now());

        cashRepo.save(Objects.requireNonNull(collection));

        return mapToCashResponse(collection);
    }

    public CashCollectionResponse verifyCash(String id) {

        CashCollection collection = cashRepo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Collection not found"));

        collection.setVerified(true);
        collection.setUpdatedAt(LocalDateTime.now());
        cashRepo.save(Objects.requireNonNull(collection));

        return mapToCashResponse(collection);
    }

    private CashCollectionResponse mapToCashResponse(CashCollection c) {
        CashCollectionResponse response = new CashCollectionResponse();
        response.setCollectionId(c.getCollectionId());
        response.setShipmentTrackingNumber(c.getShipmentId());
        response.setTotalAmount(c.getTotalAmount());
        response.setVerified(c.isVerified());
        response.setDepositedToBank(c.isDepositedToBank());
        response.setTimestamp(c.getCreatedAt());
        return response;
    }



    public InvoiceResponse generateInvoice(InvoiceRequest request) {

        double total = request.getBaseRate() + request.getTaxAndFees();

        Invoice invoice = new Invoice();
        invoice.setInvoiceId("INV-" + UUID.randomUUID().toString().substring(0, 6));
        invoice.setShipmentTrackingNumber(request.getShipmentTrackingNumber());
        invoice.setBaseRate(request.getBaseRate());
        invoice.setTaxAndFees(request.getTaxAndFees());
        invoice.setTotalAmount(total);
        invoice.setPaymentMode(request.getPaymentMode());
        invoice.setPaymentStatus("PAID");
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());

        invoiceRepo.save(Objects.requireNonNull(invoice));

        InvoiceResponse response = new InvoiceResponse();
        response.setInvoiceId(invoice.getInvoiceId());
        response.setShipmentTrackingNumber(invoice.getShipmentTrackingNumber());
        response.setTotalAmount(invoice.getTotalAmount());
        response.setPaymentStatus(invoice.getPaymentStatus());
        response.setCreatedAt(invoice.getCreatedAt());
        return response;
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
