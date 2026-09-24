import crypto from 'crypto';

export const generateUserId = () => {
  return `USR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

export const generateTrackingNumber = () => {
  return `SF${Date.now()}`;
};

export const generateShipmentId = () => {
  return `SHP${Math.abs(crypto.randomBytes(4).readInt32LE(0))}${Date.now() % 1000}`;
};

export const generateRequestId = () => {
  return `REQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const generateNotificationId = () => {
  return `NOTIF-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
};

export const generateTicketId = () => {
  return `TKT-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

export const generateMessageId = () => {
  return `MSG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const generateBranchId = () => {
  return `BR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

export const generateVehicleId = () => {
  return `VEH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

export const generateRunSheetId = () => {
  return `RS-${Date.now()}`;
};

export const generateCollectionId = () => {
  return `COL-${Date.now()}`;
};
