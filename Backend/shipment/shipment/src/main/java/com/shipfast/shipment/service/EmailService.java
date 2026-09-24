package com.shipfast.shipment.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${spring.mail.username:${MAIL_USERNAME:lingesw0561@gmail.com}}")
    private String mailUsername;

    @Value("${spring.mail.password:${MAIL_PASSWORD:}}")
    private String mailPassword;

    @Value("${resend.api.key:${RESEND_API_KEY:}}")
    private String resendApiKey;

    @Value("${resend.from.email:${RESEND_FROM_EMAIL:ShipFast <onboarding@resend.dev>}}")
    private String resendFromEmail;

    public EmailService(JavaMailSender mailSender, ObjectMapper objectMapper) {
        this.mailSender = mailSender;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public static class EmailAttachment {
        private final String name;
        private final byte[] bytes;
        private final String contentType;

        public EmailAttachment(String name, byte[] bytes, String contentType) {
            this.name = name;
            this.bytes = bytes;
            this.contentType = contentType;
        }

        public String getName() { return name; }
        public byte[] getBytes() { return bytes; }
        public String getContentType() { return contentType; }
    }

    public void sendEmail(String to, String subject, String body) {
        sendEmail(to, subject, body, Collections.emptyList());
    }

    public void sendEmail(String to, String subject, String body,
                          byte[] attachmentBytes,
                          String attachmentName,
                          String attachmentContentType) {
        if (attachmentBytes != null && attachmentBytes.length > 0 && StringUtils.hasText(attachmentName)) {
            sendEmail(to, subject, body, List.of(new EmailAttachment(attachmentName, attachmentBytes, attachmentContentType)));
        } else {
            sendEmail(to, subject, body, Collections.emptyList());
        }
    }

    public void sendEmail(String to, String subject, String body, List<EmailAttachment> attachments) {
        if (!StringUtils.hasText(to)) {
            throw new IllegalArgumentException("Email recipient is required");
        }

        String recipient = to.trim();
        String mailSubject = StringUtils.hasText(subject) ? subject.trim() : "ShipFast Notification";
        String mailBody = body != null ? body : "";

        // 1. Prioritize direct SMTP to deliver to actual recipient (sender/receiver email)
        if (StringUtils.hasText(mailPassword)) {
            try {
                sendViaSmtp(recipient, mailSubject, mailBody, attachments);
                return;
            } catch (Exception ex) {
                System.err.println("[ShipFast Email] SMTP failed for " + recipient + ": " + ex.getMessage() + ". Attempting Resend fallback...");
            }
        }

        // 2. Fallback to Resend HTTP API if configured
        if (StringUtils.hasText(resendApiKey)) {
            try {
                sendViaResend(recipient, mailSubject, mailBody, attachments);
                return;
            } catch (Exception ex) {
                System.err.println("[ShipFast Email] Resend API failed for " + recipient + ": " + ex.getMessage());
            }
        }

        // 3. If SMTP wasn't run yet, try standard SMTP
        if (!StringUtils.hasText(mailPassword)) {
            sendViaSmtp(recipient, mailSubject, mailBody, attachments);
        }
    }

    private void sendViaResend(String to, String subject, String body, List<EmailAttachment> attachments) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("from", StringUtils.hasText(resendFromEmail) ? resendFromEmail.trim() : "ShipFast <onboarding@resend.dev>");
        ArrayNode toArray = root.putArray("to");
        toArray.add(to);
        root.put("subject", subject);
        root.put("text", body);

        if (attachments != null && !attachments.isEmpty()) {
            ArrayNode attArray = root.putArray("attachments");
            for (EmailAttachment att : attachments) {
                if (att != null && att.getBytes() != null && att.getBytes().length > 0 && StringUtils.hasText(att.getName())) {
                    ObjectNode attNode = attArray.addObject();
                    attNode.put("filename", att.getName());
                    attNode.put("content", Base64.getEncoder().encodeToString(att.getBytes()));
                }
            }
        }

        String jsonPayload = objectMapper.writeValueAsString(root);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendApiKey.trim())
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(20))
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println("[ShipFast Email] Resend sent email successfully to " + to + " (status=" + response.statusCode() + ")");
        } else {
            throw new IllegalStateException("Resend HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    private void sendViaSmtp(String to, String subject, String body, List<EmailAttachment> attachments) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            boolean hasAttachments = attachments != null && !attachments.isEmpty();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    hasAttachments,
                    StandardCharsets.UTF_8.name()
            );
            if (StringUtils.hasText(mailUsername)) {
                helper.setFrom("ShipFast <" + mailUsername.trim() + ">");
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);

            if (hasAttachments) {
                for (EmailAttachment att : attachments) {
                    if (att != null && att.getBytes() != null && att.getBytes().length > 0 && StringUtils.hasText(att.getName())) {
                        helper.addAttachment(
                                att.getName(),
                                new ByteArrayDataSource(
                                        att.getBytes(),
                                        StringUtils.hasText(att.getContentType())
                                                ? att.getContentType()
                                                : "application/octet-stream"
                                )
                        );
                    }
                }
            }

            mailSender.send(message);
            System.out.println("[ShipFast Email] SMTP sent email successfully to " + to);
        } catch (MessagingException | MailException ex) {
            throw new IllegalStateException("Failed to send email to " + to + " via SMTP: " + ex.getMessage(), ex);
        }
    }
}
