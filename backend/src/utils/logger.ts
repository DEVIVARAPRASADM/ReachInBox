import winston from 'winston';
import { config } from '../config/env.config';
import * as fs from 'fs';
import * as path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format
const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Create logger
const logger = winston.createLogger({
  level: config.isDevelopment() ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        customFormat
      )
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Helper methods
export const log = {
  info: (message: string) => logger.info(message),
  error: (message: string, error?: any) => {
    if (error) {
      logger.error(`${message}: ${error.message || error}`);
    } else {
      logger.error(message);
    }
  },
  warn: (message: string) => logger.warn(message),
  debug: (message: string) => logger.debug(message),
  
  // Specialized logging
  imapEvent: (accountId: string, event: string) => {
    logger.info(`📧 [IMAP:${accountId}] ${event}`);
  },
  
  emailReceived: (subject: string, from: string) => {
    logger.info(`📨 New email: "${subject}" from ${from}`);
  },
  
  aiCategory: (category: string, confidence: number) => {
    logger.info(`🤖 Categorized as: ${category} (${(confidence * 100).toFixed(1)}%)`);
  },
  
  searchQuery: (query: string, results: number) => {
    logger.debug(`🔍 Search "${query}" - ${results} results`);
  },
  
  notification: (type: string, success: boolean) => {
    if (success) {
      logger.info(`📢 ${type} notification sent`);
    } else {
      logger.warn(`⚠️  ${type} notification failed`);
    }
  }
};

export default logger;