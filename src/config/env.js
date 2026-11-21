// Carga y centraliza las variables de entorno desde .env
import { config as loadEnv } from 'dotenv';

loadEnv();

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || './db/horary.sqlite',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
};

export const isDev = env.nodeEnv !== 'production';
