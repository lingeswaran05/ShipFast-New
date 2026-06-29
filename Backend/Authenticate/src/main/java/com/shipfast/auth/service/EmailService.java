package com.shipfast.auth.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        long startedAt = System.currentTimeMillis();
        printSmtpStatus("START", toEmail, null, startedAt);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("ShipFast Password Reset OTP");
        message.setText("Your OTP is: " + otp + "\n\nValid for 5 minutes.");

        try {
            mailSender.send(message);
            printSmtpStatus("SUCCESS", toEmail, null, startedAt);
        } catch (RuntimeException error) {
            printSmtpStatus("FAILED", toEmail, error, startedAt);
            throw error;
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
