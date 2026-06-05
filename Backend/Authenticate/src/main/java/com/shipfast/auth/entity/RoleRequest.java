package com.shipfast.auth.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "role_request")
public class RoleRequest {

    @Id
    @Column(name = "request_id", nullable = false, updatable = false)
    private String requestId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(name = "current_role", nullable = false)
    private String currentRole;

    @Column(name = "requested_role", nullable = false)
    private String requestedRole;

    @Lob
    private String reason;

    @Lob
    @Column(name = "agent_details_json")
    private String agentDetailsJson;

    @Lob
    @Column(name = "documents_json")
    private String documentsJson;

    @Column(nullable = false)
    private String status;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
