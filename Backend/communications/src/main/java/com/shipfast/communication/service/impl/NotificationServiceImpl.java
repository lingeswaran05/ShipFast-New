package com.shipfast.communication.service.impl;

import com.shipfast.communication.entity.Notification;
import com.shipfast.communication.repository.NotificationRepository;
import com.shipfast.communication.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository repository;

    @Override
    public Notification sendNotification(String userId, String type, String message) {

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setMessage(message);
        notification.setStatus("SENT");
        notification.setCreatedAt(Instant.now());

        return repository.save(notification);
    }

    @Override
    public List<Notification> getUserNotifications(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
