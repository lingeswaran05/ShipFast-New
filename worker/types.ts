export interface Env {
  DB: D1Database;
  R2_BUCKET?: R2Bucket;
  JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  MAILCHANNELS_ENABLED?: string;
  MAIL_FROM?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  APP_ENV?: string;
}

export interface UserPayload {
  id: number;
  email: string;
  role: string;
  name: string;
}
