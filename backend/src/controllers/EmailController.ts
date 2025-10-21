import { Request, Response } from 'express';
import { ElasticsearchClient } from '../services/elasticsearch/ElasticsearchClient';
import { EmailSearchParams } from '../types/email.types';
import { log } from '../utils/logger';

/**
 * Simple Email Controller - MVP
 */
export class EmailController {
  constructor(private esClient: ElasticsearchClient) {}

  /**
   * GET /api/emails - Get all emails with pagination
   */
  async getAllEmails(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const params: EmailSearchParams = { limit, offset };
      const result = await this.esClient.searchEmails(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      log.error('Get emails failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/emails/search - Search emails
   */
  async searchEmails(req: Request, res: Response): Promise<void> {
    try {
      const params: EmailSearchParams = {
        query: req.query.q as string,
        accountId: req.query.account as string,
        folder: req.query.folder as string,
        category: req.query.category as any,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0
      };

      const result = await this.esClient.searchEmails(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      log.error('Search failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/emails/:id - Get single email
   */
  async getEmailById(req: Request, res: Response): Promise<void> {
    try {
      const email = await this.esClient.getEmailById(req.params.id);
      // console.log('Email UUID:', email.id);
      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found'
        });
        return;
      }

      res.json({
        success: true,
        data: email
      });
    } catch (error: any) {
      log.error('Get email failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/emails/stats - Get statistics
   */
/**
 * GET /api/emails/stats - Get statistics safely
 */
async getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await this.esClient.getStats();

    // Limit aggregation size in Elasticsearch to avoid circuit breaking
    // (update inside ElasticsearchClient.getStats)
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    log.error('Get stats failed', error);

    // Return fallback stats instead of failing
    res.json({
      success: true,
      data: {
        totalEmails: 0,
        byCategory: {},
        byAccount: {}
      }
    });
  }
}


  /**
   * GET /api/accounts - Get configured accounts
   */
/**
 * GET /api/accounts - Get configured accounts
 */
async getAccounts(req: Request, res: Response): Promise<void> {
  try {
    const { config } = await import('../config/env.config');
    
    const accounts = config.EMAIL_ACCOUNTS.map(acc => ({
      id: acc.id,
      user: acc.user,
      label: acc.label
    }));

    // Return array directly under `data`
    res.json({
      success: true,
      data: accounts
    });
  } catch (error: any) {
    log.error('Get accounts failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [] // fallback empty array
    });
  }
}

}