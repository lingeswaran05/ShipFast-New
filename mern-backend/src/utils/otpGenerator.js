import crypto from 'crypto';

export const generateOtp = () => {
  return Math.floor(100000 + crypto.randomInt(900000)).toString();
};

export const getOtpExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};
