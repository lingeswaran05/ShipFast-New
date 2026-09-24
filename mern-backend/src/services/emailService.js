import nodemailer from 'nodemailer';

let transporter = null;

const createTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.MAIL_PORT || '587', 10);
  const user = process.env.MAIL_USERNAME || 'linwan2508@gmail.com';
  const pass = process.env.MAIL_PASSWORD || 'wwipxuylrsegganx';

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
};

export const sendRawEmail = async ({ to, subject, text, html, attachments = [] }) => {
  if (!to) return false;

  // Try Resend API if API Key is set
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'ShipFast <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          text,
          html: html || text
        })
      });
      if (res.ok) {
        console.log(`✉️ Email sent via Resend API to: ${to}`);
        return true;
      }
    } catch (resendErr) {
      console.warn('⚠️ Resend API failed, falling back to SMTP:', resendErr.message);
    }
  }

  // Fallback to Nodemailer SMTP
  try {
    const client = createTransporter();
    const from = process.env.MAIL_FROM || process.env.MAIL_USERNAME || 'ShipFast Courier <no-reply@shipfast.com>';

    await client.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
      attachments
    });

    console.log(`✉️ Email sent via SMTP to: ${to}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Email delivery failed to ${to}:`, error.message);
    return false;
  }
};

export const sendOtpEmail = async (email, otp) => {
  const subject = 'Your ShipFast OTP Verification Code';
  const text = `Hello,\n\nYour OTP verification code is: ${otp}\nThis OTP is valid for 10 minutes.\n\nRegards,\nShipFast Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #7c3aed;">ShipFast Logistics</h2>
      <p>Hello,</p>
      <p>Your one-time password (OTP) verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b; background: #f1f5f9; padding: 12px 24px; text-align: center; border-radius: 6px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} ShipFast Logistics. All rights reserved.</p>
    </div>
  `;
  return sendRawEmail({ to: email, subject, text, html });
};

export const sendBookingEmail = async (shipment) => {
  const tracking = shipment.trackingNumber || shipment.id;
  const senderEmail = shipment.sender?.email;
  const recipientEmail = shipment.recipient?.email;
  const senderName = shipment.sender?.name || 'Customer';
  const recipientName = shipment.recipient?.name || 'Recipient';

  const subject = `Shipment Booked - ${tracking}`;
  const text = `Hello ${senderName},\n\nYour shipment has been booked successfully.\n\nBooking details:\nStatus: Booked\nTracking ID: ${tracking}\nReceiver: ${recipientName}\nService Type: ${shipment.serviceType || 'Standard'}\nEstimated delivery: ${shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : '-'}\nAmount: Rs. ${shipment.cost || 0}\n\nYou can track your shipment anytime from the My Shipments page in your ShipFast dashboard.\n\nRegards,\nShipFast Courier`;

  const recipients = [senderEmail, recipientEmail].filter(Boolean);
  for (const recipient of recipients) {
    sendRawEmail({ to: recipient, subject, text }).catch(() => {});
  }
};

export const sendAssignmentEmail = async (shipment, agentDetails = {}) => {
  const tracking = shipment.trackingNumber || shipment.id;
  const senderEmail = shipment.sender?.email;
  const recipientEmail = shipment.recipient?.email;
  const senderName = shipment.sender?.name || 'Customer';
  const agentName = agentDetails.fullName || agentDetails.name || shipment.assignedAgentId || 'Assigned Agent';
  const agentContact = agentDetails.phoneNumber || agentDetails.phone || '-';

  const subject = `Agent Assigned - ${tracking}`;
  const text = `Hello ${senderName},\n\nAn agent has been assigned to your shipment ${tracking}.\n\nAgent details:\nName: ${agentName}\nContact: ${agentContact}\nAgent ID: ${shipment.assignedAgentId || '-'}\n\nCurrent status: ${shipment.status || 'In Transit'}\nTracking ID: ${tracking}\n\nRegards,\nShipFast Courier`;

  const recipients = [senderEmail, recipientEmail].filter(Boolean);
  for (const recipient of recipients) {
    sendRawEmail({ to: recipient, subject, text }).catch(() => {});
  }
};

export const sendStatusUpdateEmail = async (shipment, newStatus) => {
  if (String(newStatus).toLowerCase() === 'delivered') return;

  const tracking = shipment.trackingNumber || shipment.id;
  const senderEmail = shipment.sender?.email;
  const recipientEmail = shipment.recipient?.email;
  const senderName = shipment.sender?.name || 'Customer';

  const subject = `Shipment Status Update: ${newStatus} - ${tracking}`;
  const text = `Hello ${senderName},\n\nYour shipment ${tracking} has been updated.\n\nStatus: ${newStatus}\nUpdated at: ${new Date().toLocaleString()}\nTracking ID: ${tracking}\nService Type: ${shipment.serviceType || 'Standard'}\n\nYou can track your shipment anytime in your ShipFast dashboard.\n\nRegards,\nShipFast Courier`;

  const recipients = [senderEmail, recipientEmail].filter(Boolean);
  for (const recipient of recipients) {
    sendRawEmail({ to: recipient, subject, text }).catch(() => {});
  }
};

export const sendDeliveryEmail = async (shipment, agentDetails = {}) => {
  const tracking = shipment.trackingNumber || shipment.id;
  const senderEmail = shipment.sender?.email;
  const recipientEmail = shipment.recipient?.email;
  const senderName = shipment.sender?.name || 'Customer';
  const agentName = agentDetails.fullName || agentDetails.name || shipment.deliveredBy || 'Assigned Agent';

  const subject = `Shipment Status: Delivered - ${tracking}`;
  const text = `Hello ${senderName},\n\nYour shipment ${tracking} has been delivered successfully.\n\nDelivery details:\nStatus: Delivered\nDelivered at: ${shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleString() : new Date().toLocaleString()}\nDelivered by: ${agentName}\nTracking ID: ${tracking}\n\nPlease give your feedback from the My Shipments page in your ShipFast dashboard.\n\nRegards,\nShipFast Courier`;

  const recipients = [senderEmail, recipientEmail].filter(Boolean);
  for (const recipient of recipients) {
    sendRawEmail({ to: recipient, subject, text }).catch(() => {});
  }
};
