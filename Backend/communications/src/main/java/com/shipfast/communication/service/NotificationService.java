package com.shipfast.communication.service;

import com.shipfast.communication.entity.Notification;
import java.util.List;

public interface NotificationService {

    Notification sendNotification(String userId, String type, String message);

    List<Notification> getUserNotifications(String userId);
}
