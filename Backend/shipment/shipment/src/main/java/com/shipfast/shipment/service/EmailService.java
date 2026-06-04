package com.shipfast.shipment.service;

import java.nio.charset.StandardCharsets;

import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(String to, String subject, String body) {
        sendEmail(to, subject, body, null, null, null);
    }

    public void sendEmail(String to, String subject, String body,
                          byte[] attachmentBytes,
                          String attachmentName,
                          String attachmentContentType) {
        if (!StringUtils.hasText(to)) {
            throw new IllegalArgumentException("Email recipient is required");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            boolean hasAttachment = attachmentBytes != null && attachmentBytes.length > 0
                    && StringUtils.hasText(attachmentName);
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    hasAttachment,
                    StandardCharsets.UTF_8.name()
            );
            helper.setTo(to.trim());
            helper.setSubject(StringUtils.hasText(subject) ? subject : "ShipFast Notification");
            helper.setText(body != null ? body : "", false);

            if (hasAttachment) {
                helper.addAttachment(
                        attachmentName,
                        new ByteArrayDataSource(
                                attachmentBytes,
                                StringUtils.hasText(attachmentContentType)
                                        ? attachmentContentType
                                        : "application/octet-stream"
                        )
                );
            }

            mailSender.send(message);
        } catch (MessagingException | MailException ex) {
            throw new IllegalStateException("Failed to send email to " + to, ex);
        }
    }
}
