package com.shipfast.communication.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shipfast.communication.dto.ApiResponse;
import com.shipfast.communication.dto.SupportTicketCreateRequest;
import com.shipfast.communication.dto.SupportTicketReplyRequest;
import com.shipfast.communication.dto.SupportTicketStatusRequest;
import com.shipfast.communication.entity.SupportMessage;
import com.shipfast.communication.entity.SupportTicket;
import com.shipfast.communication.repository.SupportRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor

public class SupportController {

    private final SupportRepository repository;

    @PostMapping("/create")
    public ApiResponse<SupportTicket> create(@RequestBody SupportTicketCreateRequest request) {
        if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
            throw new RuntimeException("userId is required");
        }

        LocalDateTime now = LocalDateTime.now();
        SupportTicket ticket = new SupportTicket();
        ticket.setUserId(request.getUserId());
        ticket.setSubject(request.getSubject() == null || request.getSubject().trim().isEmpty() ? "Support Ticket" : request.getSubject().trim());
        ticket.setDescription(request.getDescription() == null ? "" : request.getDescription().trim());
        ticket.setCategory(request.getCategory() == null || request.getCategory().trim().isEmpty() ? "General" : request.getCategory().trim());
        ticket.setPriority(request.getPriority() == null || request.getPriority().trim().isEmpty() ? "Medium" : request.getPriority().trim());
        ticket.setStatus("OPEN");
        ticket.setAssignedToRole("ADMIN");
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);
        ticket.getMessages().add(
                SupportMessage.builder()
                        .messageId("MSG-" + UUID.randomUUID().toString().substring(0, 8))
                        .senderId(request.getUserId())
                        .senderName(request.getSenderName() == null || request.getSenderName().trim().isEmpty() ? "Customer" : request.getSenderName().trim())
                        .senderRole(request.getSenderRole() == null || request.getSenderRole().trim().isEmpty() ? "customer" : request.getSenderRole().trim())
                        .message(ticket.getDescription())
                        .createdAt(now)
                        .build()
        );

        return new ApiResponse<>(
                true,
                "Ticket created successfully",
                repository.save(ticket)
        );
    }

    @GetMapping("/user/{userId}")
    public ApiResponse<List<SupportTicket>> getUserTickets(@PathVariable String userId) {
        return new ApiResponse<>(
                true,
                "Tickets fetched",
                repository.findByUserIdOrderByUpdatedAtDesc(userId)
        );
    }

    @GetMapping
    public ApiResponse<List<SupportTicket>> getAllTickets(@RequestParam(required = false) String status) {
        List<SupportTicket> data;
        if (status != null && !status.trim().isEmpty()) {
            data = repository.findByStatusOrderByUpdatedAtDesc(status.trim().toUpperCase());
        } else {
            data = repository.findAllByOrderByUpdatedAtDesc();
        }
        return new ApiResponse<>(
                true,
                "Tickets fetched",
                data
        );
    }

    @GetMapping("/{id}")
    public ApiResponse<SupportTicket> getTicketById(@PathVariable String id) {
        SupportTicket ticket = repository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        return new ApiResponse<>(
                true,
                "Ticket fetched",
                ticket
        );
    }

    @PutMapping("/{id}/reply")
    public ApiResponse<SupportTicket> reply(@PathVariable String id,
                                            @RequestBody SupportTicketReplyRequest request) {
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new RuntimeException("Reply message is required");
        }

        SupportTicket ticket = repository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        if (ticket.getMessages() == null) {
            ticket.setMessages(new ArrayList<>());
        }

        ticket.getMessages().add(
                SupportMessage.builder()
                        .messageId("MSG-" + UUID.randomUUID().toString().substring(0, 8))
                        .senderId(request.getSenderId())
                        .senderName(request.getSenderName() == null || request.getSenderName().trim().isEmpty() ? "Support" : request.getSenderName().trim())
                        .senderRole(request.getSenderRole() == null || request.getSenderRole().trim().isEmpty() ? "admin" : request.getSenderRole().trim())
                        .message(request.getMessage().trim())
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        if ("CLOSED".equalsIgnoreCase(ticket.getStatus()) || "RESOLVED".equalsIgnoreCase(ticket.getStatus())) {
            ticket.setStatus("OPEN");
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        return new ApiResponse<>(
                true,
                "Reply added successfully",
                repository.save(ticket)
        );
    }

    @PutMapping("/{id}/status")
    public ApiResponse<SupportTicket> updateStatus(@PathVariable String id,
                                                   @RequestBody SupportTicketStatusRequest request) {
        if (request.getStatus() == null || request.getStatus().trim().isEmpty()) {
            throw new RuntimeException("status is required");
        }
        SupportTicket ticket = repository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        ticket.setStatus(request.getStatus().trim().toUpperCase());
        if (request.getAssignedToRole() != null) {
            ticket.setAssignedToRole(request.getAssignedToRole());
        }
        if (request.getAssignedToUserId() != null) {
            ticket.setAssignedToUserId(request.getAssignedToUserId());
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        return new ApiResponse<>(
                true,
                "Ticket status updated successfully",
                repository.save(ticket)
        );
    }

    @PutMapping("/close/{id}")
    public ApiResponse<SupportTicket> close(@PathVariable String id) {
        SupportTicketStatusRequest request = new SupportTicketStatusRequest();
        request.setStatus("CLOSED");
        return updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable String id) {
        SupportTicket ticket = repository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        repository.delete(Objects.requireNonNull(ticket));
        return new ApiResponse<>(
                true,
                "Ticket deleted successfully",
                id
        );
    }
}
