import { ImapConnectionManager } from './imap/ImapConnectionManager';
import { ElasticsearchClient } from './elasticsearch/ElasticsearchClient';
import { GeminiCategorizer } from './ai/GeminiCategorizer';
import { NotificationService } from './Notifications/NotificationService';
import { config } from '../config/env.config';
import { Email, EmailCategory, EmailAccountConfig } from '../types/email.types';
import { log } from '../utils/logger';

export class EmailOrchestrator {
  private imapManager: ImapConnectionManager;
  private esClient: ElasticsearchClient;
  private aiCategorizer: GeminiCategorizer;
  private notificationService: NotificationService;
  private isInitialized = false;

  constructor() {
    this.imapManager = new ImapConnectionManager();
    this.esClient = new ElasticsearchClient();
    this.aiCategorizer = new GeminiCategorizer();
    this.notificationService = new NotificationService();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    log.info('🚀 Initializing Email Orchestrator');
    await this.esClient.initialize();
    await this.connectAllAccounts();
    this.setupEmailListener();
    await this.initialSync();
    this.isInitialized = true;
    log.info('✅ System initialized and running!');
  }

  private async connectAllAccounts(): Promise<void> {
    for (const account of config.EMAIL_ACCOUNTS) {
      try {
        await this.imapManager.connect(account);
      } catch (error) {
        log.error(`Failed to connect ${account.label}`, error);
      }
    }
  }  // <--- FIX: added missing brace

  private setupEmailListener(): void {
    this.imapManager.on('newEmail', async (email: Email) => {
      await this.processNewEmail(email);
    });
  }

  private async processNewEmail(email: Email): Promise<void> {
    try {
      await this.esClient.indexEmail(email);
      log.info(`✅ Indexed: ${email.subject}`);
      const result = await this.aiCategorizer.categorize(email);
      email.aiCategory = result.category;
      email.aiConfidence = result.confidence;
      log.aiCategory(result.category, result.confidence);
      await this.esClient.updateEmailCategory(email.id, result.category, result.confidence);
      if (result.category === EmailCategory.INTERESTED) {
        await this.notificationService.notifyInterestedLead(email);
      }
    } catch (error) {
      log.error('Failed to process email', error);
    }
  }  // <--- FIX: added missing brace

  private async initialSync(): Promise<void> {
    const allEmails: Email[] = [];
    for (const account of config.EMAIL_ACCOUNTS) {
      try {
        const emails: Email[] = await this.imapManager.fetchLastNDays(account as EmailAccountConfig, 30);
        allEmails.push(...emails);
      } catch (error) {
        log.error(`Sync failed for ${account.label}`, error);
      }
    }
    if (allEmails.length === 0) {
      log.warn('No emails to sync');
      return;
    }
    await this.esClient.bulkIndexEmails(allEmails);
    log.info(`🤖 Categorizing ${allEmails.length} emails...`);
    for (const email of allEmails) {
      try {
        const result = await this.aiCategorizer.categorize(email);
        await this.esClient.updateEmailCategory(email.id, result.category, result.confidence);
        if (result.category === EmailCategory.INTERESTED) {
          await this.notificationService.notifyInterestedLead(email);
        }
      } catch (error) {
        log.error(`Failed to categorize ${email.id}`, error);
      }
    }
    log.info(`✅ Synced and categorized ${allEmails.length} emails`);
  }

  public getEsClient(): ElasticsearchClient {
    return this.esClient;
  }

  public async shutdown(): Promise<void> {
    log.info('Shutting down...');
    await this.imapManager.disconnectAll();
    await this.esClient.close();
    log.info('✅ Shutdown complete');
  }
}
