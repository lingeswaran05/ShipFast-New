package com.shipfast.communication.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shipfast.communication.dto.ApiResponse;
import com.shipfast.communication.entity.Notification;
import com.shipfast.communication.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor

public class NotificationController {

    private final NotificationService service;

    @PostMapping("/send")
    public ApiResponse<Notification> send(
            @RequestParam String userId,
            @RequestParam String type,
            @RequestParam String message) {

        return new ApiResponse<>(
                true,
                "Notification sent successfully",
                service.sendNotification(userId, type, message)
        );
    }

    @GetMapping("/{userId}")
    public ApiResponse<List<Notification>> getUserNotifications(@PathVariable String userId) {

        return new ApiResponse<>(
                true,
                "Notifications fetched",
                service.getUserNotifications(userId)
        );
    }
}
