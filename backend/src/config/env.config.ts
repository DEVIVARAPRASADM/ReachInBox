import dotenv from 'dotenv';
import { EmailAccountConfig } from '../types/email.types';

// Load environment variables
dotenv.config();

class Config {
  public readonly PORT: number;
  public readonly NODE_ENV: string;

  // Elasticsearch
  public readonly ELASTICSEARCH_URL: string;
  public readonly ES_INDEX_NAME: string;

  // Email accounts
  public readonly EMAIL_ACCOUNTS: EmailAccountConfig[];

  // Gemini AI
  public readonly GEMINI_API_KEY: string;

  // Qdrant
  public readonly QDRANT_URL: string;

  // Notifications
  public readonly SLACK_WEBHOOK_URL?: string;
  public readonly EXTERNAL_WEBHOOK_URL?: string;

  // Product info for RAG
  public readonly PRODUCT_INFO: {
    name: string;
    meetingLink: string;
    description: string;
  };

  constructor() {
    this.PORT = parseInt(process.env.PORT || '3000');
    this.NODE_ENV = process.env.NODE_ENV || 'development';

    this.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    this.ES_INDEX_NAME = process.env.ES_INDEX_NAME || 'emails';

    this.EMAIL_ACCOUNTS = this.loadEmailAccounts();

    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    if (!this.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not set');
    }

    this.QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

    this.SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
    this.EXTERNAL_WEBHOOK_URL = process.env.EXTERNAL_WEBHOOK_URL;

    this.PRODUCT_INFO = {
      name: process.env.PRODUCT_NAME || 'ReachInbox',
      meetingLink: process.env.MEETING_LINK || 'https://cal.com/example',
      description: process.env.PRODUCT_DESCRIPTION || 'AI-powered email platform'
    };

    this.validate();
  }

  private loadEmailAccounts(): EmailAccountConfig[] {
    const accounts: EmailAccountConfig[] = [];

    // Load account 1
    if (process.env.EMAIL1_USER && process.env.EMAIL1_PASSWORD) {
      accounts.push({
        id: 'account-1',
        user: process.env.EMAIL1_USER,
        password: process.env.EMAIL1_PASSWORD,
        host: process.env.EMAIL1_HOST || 'imap.gmail.com',
        port: parseInt(process.env.EMAIL1_PORT || '993'),
        tls: true,
        label: 'Primary Account'
      });
    }

    // Load account 2
    if (process.env.EMAIL2_USER && process.env.EMAIL2_PASSWORD) {
      accounts.push({
        id: 'account-2',
        user: process.env.EMAIL2_USER,
        password: process.env.EMAIL2_PASSWORD,
        host: process.env.EMAIL2_HOST || 'imap.gmail.com',
        port: parseInt(process.env.EMAIL2_PORT || '993'),
        tls: true,
        label: 'Secondary Account'
      });
    }

    return accounts;
  }

  private validate(): void {
    const errors: string[] = [];

    if (this.EMAIL_ACCOUNTS.length < 2) {
      errors.push('At least 2 email accounts required');
    }

    if (!this.ELASTICSEARCH_URL) {
      errors.push('ELASTICSEARCH_URL is required');
    }

    if (errors.length > 0) {
      console.error('❌ Configuration errors:');
      errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log('✅ Configuration loaded');
    console.log(`   - ${this.EMAIL_ACCOUNTS.length} email account(s)`);
    console.log(`   - Elasticsearch: ${this.ELASTICSEARCH_URL}`);
  }

  public getAccountById(accountId: string): EmailAccountConfig | undefined {
    return this.EMAIL_ACCOUNTS.find(acc => acc.id === accountId);
  }

  public isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }
}

export const config = new Config();
export default config;