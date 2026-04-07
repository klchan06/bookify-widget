export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Boekgerust <noreply@boekgerust.nl>',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/google/callback',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
} as const;
