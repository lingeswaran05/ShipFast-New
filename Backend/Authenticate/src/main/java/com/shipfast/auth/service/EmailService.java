package com.shipfast.auth.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

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

    public void sendOtpEmail(String toEmail, String otp) {
        if (!StringUtils.hasText(toEmail)) {
            throw new IllegalArgumentException("Recipient email is required");
        }

        String recipient = toEmail.trim();
        String subject = "ShipFast Password Reset OTP";
        String body = "Your OTP is: " + otp + "\n\nValid for 5 minutes.";

        // 1. Prioritize direct SMTP to deliver directly to the recipient
        if (StringUtils.hasText(mailPassword)) {
            try {
                sendViaSmtp(recipient, subject, body);
                return;
            } catch (Exception ex) {
                System.err.println("[ShipFast Email] SMTP OTP failed for " + recipient + ": " + ex.getMessage() + ". Attempting Resend fallback...");
            }
        }

        // 2. Fallback to Resend HTTP API if configured
        if (StringUtils.hasText(resendApiKey)) {
            try {
                sendViaResend(recipient, subject, body);
                return;
            } catch (Exception ex) {
                System.err.println("[ShipFast Email] Resend OTP email failed for " + recipient + ": " + ex.getMessage());
            }
        }

        // 3. If SMTP wasn't run yet, try standard SMTP
        if (!StringUtils.hasText(mailPassword)) {
            sendViaSmtp(recipient, subject, body);
        }
    }

    private void sendViaSmtp(String recipient, String subject, String body) {
        long startedAt = System.currentTimeMillis();
        printSmtpStatus("START", recipient, null, startedAt);

        SimpleMailMessage message = new SimpleMailMessage();
        if (StringUtils.hasText(mailUsername)) {
            message.setFrom("ShipFast <" + mailUsername.trim() + ">");
        }
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
            printSmtpStatus("SUCCESS", recipient, null, startedAt);
        } catch (RuntimeException error) {
            printSmtpStatus("FAILED", recipient, error, startedAt);
            throw error;
        }
    }

    private void sendViaResend(String to, String subject, String body) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("from", StringUtils.hasText(resendFromEmail) ? resendFromEmail.trim() : "ShipFast <onboarding@resend.dev>");
        ArrayNode toArray = root.putArray("to");
        toArray.add(to);
        root.put("subject", subject);
        root.put("text", body);

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
            System.out.println("[ShipFast Email] Resend OTP email sent successfully to " + to + " (status=" + response.statusCode() + ")");
        } else {
            throw new IllegalStateException("Resend HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    private void printSmtpStatus(String status, String toEmail, RuntimeException error, long startedAt) {
        long elapsedMs = System.currentTimeMillis() - startedAt;
        if (mailSender instanceof JavaMailSenderImpl sender) {
            String username = sender.getUsername();
            java.util.Properties props = sender.getJavaMailProperties();
            System.out.println("[ShipFast SMTP] status=" + status
                    + " host=" + sender.getHost()
                    + " port=" + sender.getPort()
                    + " usernameSet=" + (username != null && !username.isBlank())
                    + " username=" + maskEmail(username)
                    + " to=" + maskEmail(toEmail)
                    + " auth=" + props.getProperty("mail.smtp.auth")
                    + " starttls=" + props.getProperty("mail.smtp.starttls.enable")
                    + " starttlsRequired=" + props.getProperty("mail.smtp.starttls.required")
                    + " sslEnable=" + props.getProperty("mail.smtp.ssl.enable")
                    + " mailDebug=" + props.getProperty("mail.debug")
                    + " connectionTimeoutMs=" + props.getProperty("mail.smtp.connectiontimeout")
                    + " readTimeoutMs=" + props.getProperty("mail.smtp.timeout")
                    + " writeTimeoutMs=" + props.getProperty("mail.smtp.writetimeout")
                    + " elapsedMs=" + elapsedMs);
        } else {
            System.out.println("[ShipFast SMTP] status=" + status
                    + " senderType=" + mailSender.getClass().getName()
                    + " to=" + maskEmail(toEmail)
                    + " elapsedMs=" + elapsedMs);
        }

        if (error != null) {
            Throwable root = error;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            System.out.println("[ShipFast SMTP] errorClass=" + error.getClass().getName()
                    + " errorMessage=" + error.getMessage()
                    + " rootClass=" + root.getClass().getName()
                    + " rootMessage=" + root.getMessage());
        }
    }

    private String maskEmail(String value) {
        if (value == null || value.isBlank()) return "blank";
        int at = value.indexOf('@');
        if (at <= 1) return "***";
        return value.charAt(0) + "***" + value.substring(at);
    }
}
