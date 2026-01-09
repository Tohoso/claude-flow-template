import { config as loadEnv } from 'dotenv';
import type { AppConfig } from '../types/index.js';

// Load .env file
loadEnv();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export function loadConfig(): AppConfig {
  return {
    googleDrive: {
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
      redirectUri: optionalEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/callback'),
      pendingFolderId: requireEnv('GOOGLE_PENDING_FOLDER_ID'),
      processedFolderId: requireEnv('GOOGLE_PROCESSED_FOLDER_ID'),
    },
    gemini: {
      apiKey: requireEnv('GEMINI_API_KEY'),
      model: optionalEnv('GEMINI_MODEL', 'gemini-2.5-flash-preview-04-17'),
    },
    freee: {
      clientId: requireEnv('FREEE_CLIENT_ID'),
      clientSecret: requireEnv('FREEE_CLIENT_SECRET'),
      redirectUri: optionalEnv('FREEE_REDIRECT_URI', 'http://localhost:3000/freee/callback'),
      companyId: parseInt(requireEnv('FREEE_COMPANY_ID'), 10),
    },
    cronSchedule: optionalEnv('CRON_SCHEDULE', '0 * * * *'),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),
  };
}

export const config = loadConfig();
