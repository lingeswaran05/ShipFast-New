package com.shipfast.communication.repository;

import com.shipfast.communication.entity.SupportTicket;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SupportRepository
        extends MongoRepository<SupportTicket, String> {

    List<SupportTicket> findByUserIdOrderByUpdatedAtDesc(String userId);

    List<SupportTicket> findByStatusOrderByUpdatedAtDesc(String status);

    List<SupportTicket> findAllByOrderByUpdatedAtDesc();
}
