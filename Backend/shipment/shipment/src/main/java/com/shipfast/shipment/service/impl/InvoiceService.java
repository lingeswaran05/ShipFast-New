package com.shipfast.shipment.service.impl;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Service;

import com.shipfast.shipment.entity.Address;
import com.shipfast.shipment.entity.Shipment;

@Service
public class InvoiceService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final Color INK = new Color(15, 23, 42);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color LINE = new Color(226, 232, 240);
    private static final Color BRAND = new Color(124, 58, 237);

    public byte[] generateInvoice(Shipment shipment) {
        try {
            BufferedImage image = new BufferedImage(900, 1220, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            drawInvoice(g, shipment);
            g.dispose();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate invoice", ex);
        }
    }

    private void drawInvoice(Graphics2D g, Shipment shipment) {
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 900, 1220);

        g.setColor(new Color(248, 250, 252));
        g.fillRect(55, 55, 790, 1110);
        g.setColor(LINE);
        g.drawRect(55, 55, 790, 1110);

        g.setColor(BRAND);
        g.fillRoundRect(90, 90, 52, 52, 14, 14);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 26));
        g.drawString("S", 108, 126);

        g.setColor(INK);
        g.setFont(new Font("SansSerif", Font.BOLD, 28));
        g.drawString("INVOICE", 160, 112);
        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.PLAIN, 14));
        g.drawString("#INV-" + text(shipment.getTrackingNumber(), shipment.getId()), 160, 136);

        g.setColor(INK);
        g.setFont(new Font("SansSerif", Font.BOLD, 22));
        drawRight(g, "ShipFast Courier", 805, 112);
        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.PLAIN, 14));
        drawRight(g, "123 Logistics Park, Mumbai", 805, 136);
        drawRight(g, "support@shipfast.com", 805, 158);

        line(g, 90, 205, 810, 205);
        drawMeta(g, "Invoice Date", shipment.getCreatedAt() != null ? shipment.getCreatedAt().format(DATE_FORMAT) : "-", 110, 250);
        drawMeta(g, "Due Date", shipment.getEstimatedDelivery() != null ? shipment.getEstimatedDelivery().format(DATE_FORMAT) : "-", 420, 250);
        drawMeta(g, "Status", paymentStatus(shipment), 110, 330);
        drawMeta(g, "Amount Due", "Rs." + amountDue(shipment), 420, 330);

        line(g, 90, 385, 810, 385);
        drawParty(g, "BILL TO", shipment.getRecipient(), 110, 430);
        drawParty(g, "BILL FROM", shipment.getSender(), 110, 560);

        g.setColor(new Color(241, 245, 249));
        g.fillRect(90, 710, 720, 48);
        g.setColor(LINE);
        g.drawRect(90, 710, 720, 48);
        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.BOLD, 13));
        g.drawString("DESCRIPTION", 110, 740);
        drawRight(g, "QTY", 560, 740);
        drawRight(g, "RATE", 680, 740);
        drawRight(g, "AMOUNT", 790, 740);

        int y = 795;
        double subtotal = amount(shipment);
        double tax = Math.round(subtotal * 0.05);
        drawItem(g, serviceLabel(shipment), "1", "Rs." + Math.round(subtotal), "Rs." + Math.round(subtotal), y);
        y += 58;
        drawItem(g, "Tax", "1", "Rs." + Math.round(tax), "Rs." + Math.round(tax), y);

        line(g, 520, 955, 810, 955);
        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.PLAIN, 15));
        drawRight(g, "Subtotal", 680, 990);
        drawRight(g, "Tax", 680, 1028);
        g.setColor(INK);
        g.setFont(new Font("SansSerif", Font.BOLD, 18));
        drawRight(g, "Total", 680, 1072);
        drawRight(g, "Rs." + Math.round(subtotal + tax), 790, 1072);
        g.setFont(new Font("SansSerif", Font.PLAIN, 15));
        drawRight(g, "Rs." + Math.round(subtotal), 790, 990);
        drawRight(g, "Rs." + Math.round(tax), 790, 1028);

        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.PLAIN, 13));
        g.drawString("Tracking: " + text(shipment.getTrackingNumber(), "-"), 110, 1125);
        g.drawString("Thank you for choosing ShipFast.", 110, 1148);
    }

    private void drawMeta(Graphics2D g, String label, String value, int x, int y) {
        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.PLAIN, 13));
        g.drawString(label, x, y);
        g.setColor(INK);
        g.setFont(new Font("SansSerif", Font.BOLD, 17));
        g.drawString(value, x, y + 28);
    }

    private void drawParty(Graphics2D g, String title, Address address, int x, int y) {
        g.setColor(MUTED);
        g.setFont(new Font("SansSerif", Font.BOLD, 13));
        g.drawString(title, x, y);
        g.setColor(INK);
        g.setFont(new Font("SansSerif", Font.BOLD, 18));
        g.drawString(text(address != null ? address.getName() : null, "-"), x, y + 35);
        g.setColor(new Color(71, 85, 105));
        g.setFont(new Font("SansSerif", Font.PLAIN, 14));
        int lineY = y + 60;
        for (String line : wrap(g, address != null ? address.getAddress() : "", 620)) {
            g.drawString(line, x, lineY);
            lineY += 20;
        }
        if (address != null && hasText(address.getEmail())) {
            g.drawString(address.getEmail(), x, lineY);
        }
    }

    private void drawItem(Graphics2D g, String description, String qty, String rate, String amount, int y) {
        g.setColor(INK);
        g.setFont(new Font("SansSerif", Font.PLAIN, 15));
        g.drawString(description, 110, y);
        drawRight(g, qty, 560, y);
        drawRight(g, rate, 680, y);
        drawRight(g, amount, 790, y);
        line(g, 90, y + 30, 810, y + 30);
    }

    private void drawRight(Graphics2D g, String text, int rightX, int y) {
        FontMetrics metrics = g.getFontMetrics();
        g.drawString(text, rightX - metrics.stringWidth(text), y);
    }

    private void line(Graphics2D g, int x1, int y1, int x2, int y2) {
        g.setColor(LINE);
        g.setStroke(new BasicStroke(1f));
        g.drawLine(x1, y1, x2, y2);
    }

    private List<String> wrap(Graphics2D g, String value, int width) {
        String text = text(value, "-");
        List<String> lines = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String word : text.split("\\s+")) {
            String candidate = current.length() == 0 ? word : current + " " + word;
            if (g.getFontMetrics().stringWidth(candidate) > width && current.length() > 0) {
                lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current = new StringBuilder(candidate);
            }
        }
        if (current.length() > 0) lines.add(current.toString());
        return lines;
    }

    private String serviceLabel(Shipment shipment) {
        return text(shipment.getServiceType(), "Standard") + " Delivery Service";
    }

    private String paymentStatus(Shipment shipment) {
        String status = text(shipment.getPaymentStatus(), "PENDING").toUpperCase();
        return "SUCCESS".equals(status) ? "Paid" : status;
    }

    private long amountDue(Shipment shipment) {
        return "SUCCESS".equalsIgnoreCase(shipment.getPaymentStatus()) ? 0 : Math.round(amount(shipment));
    }

    private double amount(Shipment shipment) {
        return shipment.getCost() != null ? Math.max(0, shipment.getCost()) : 0;
    }

    private String text(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
