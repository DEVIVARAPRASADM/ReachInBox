import { Client } from '@elastic/elasticsearch';
import { config } from '../../config/env.config';
import { Email, EmailSearchParams, EmailSearchResult, StatsResponse } from '../../types/email.types';
import { log } from '../../utils/logger';

/**
 * Elasticsearch Client - Phase 2
 * Handles email indexing and searching
 */
export class ElasticsearchClient {
  private client: Client;
  private indexName: string;

  constructor() {
    this.client = new Client({ node: config.ELASTICSEARCH_URL });
    this.indexName = config.ES_INDEX_NAME;
    log.info('Elasticsearch client initialized');
  }
  /**
   * Initialize index with mappings
   */
  async initialize(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (indexExists.body) {
        log.info(`Index '${this.indexName}' already exists`);
        return;
      }

      // Create index with proper mappings
      await this.client.indices.create({
        index: this.indexName,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              accountId: { type: 'keyword' },
              messageId: { type: 'keyword' },
              uid: { type: 'long' },
              folder: { type: 'keyword' },
              
              'from.name': { type: 'text' },
              'from.address': { type: 'keyword' },
              
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              htmlBody: { type: 'text', index: false },
              
              date: { type: 'date' },
              indexedAt: { type: 'date' },
              
              aiCategory: { type: 'keyword' },
              aiConfidence: { type: 'float' },
              
              flags: { type: 'keyword' },
              hasAttachments: { type: 'boolean' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0
          }
        }
      });

      log.info(`✅ Created index '${this.indexName}'`);
    } catch (error) {
      log.error('Failed to initialize Elasticsearch', error);
      throw error;
    }
  }

  /**
   * Index a single email
   */
  async indexEmail(email: Email): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        body: email,
        refresh: true
      });

      log.debug(`Indexed: ${email.id}`);
    } catch (error) {
      log.error(`Failed to index ${email.id}`, error);
      throw error;
    }
  }

  /**
   * Bulk index multiple emails
   */
  async bulkIndexEmails(emails: Email[]): Promise<void> {
    if (emails.length === 0) return;

    try {
      const operations = emails.flatMap((email) => [
        { index: { _index: this.indexName, _id: email.id } },
        email
      ]);

      const result = await this.client.bulk({
        body: operations,
        refresh: true
      });

      if (result.body.errors) {
        log.error('Some emails failed to index');
      } else {
        log.info(`✅ Bulk indexed ${emails.length} emails`);
      }
    } catch (error) {
      log.error('Bulk indexing failed', error);
      throw error;
    }
  }

  /**
   * Search emails with filters
   */
  async searchEmails(params: EmailSearchParams): Promise<EmailSearchResult> {
    try {
      const must: any[] = [];
      const filter: any[] = [];

      // Full-text search
      if (params.query && params.query.trim()) {
        must.push({
          multi_match: {
            query: params.query,
            fields: ['subject^2', 'body', 'from.name'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Filters
      if (params.accountId) {
        filter.push({ term: { accountId: params.accountId } });
      }

      if (params.folder) {
        filter.push({ term: { folder: params.folder } });
      }

      if (params.category) {
        filter.push({ term: { aiCategory: params.category } });
      }

      if (params.from) {
        filter.push({ term: { 'from.address': params.from } });
      }

      if (params.fromDate || params.toDate) {
        const dateRange: any = {};
        if (params.fromDate) dateRange.gte = params.fromDate;
        if (params.toDate) dateRange.lte = params.toDate;
        filter.push({ range: { date: dateRange } });
      }

      const limit = params.limit || 20;
      const offset = params.offset || 0;

      const searchBody: any = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter: filter
          }
        },
        sort: [{ date: { order: 'desc' } }],
        from: offset,
        size: limit
      };

      const startTime = Date.now();
      const result = await this.client.search({
        index: this.indexName,
        body: searchBody
      });
      const took = Date.now() - startTime;

      const emails = result.body.hits.hits.map((hit: any) => hit._source as Email);
      const total = typeof result.body.hits.total === 'number' 
        ? result.body.hits.total 
        : result.body.hits.total?.value || 0;

      log.searchQuery(params.query || 'all', total);

      return {
        emails,
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        took
      };
    } catch (error) {
      log.error('Search failed', error);
      throw error;
    }
  }

  /**
   * Update email category
   */
  async updateEmailCategory(emailId: string, category: string, confidence: number): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id: emailId,
        body: {
          doc: {
            aiCategory: category,
            aiConfidence: confidence
          }
        },
        refresh: true
      });

      log.debug(`Updated category for ${emailId}: ${category}`);
    } catch (error) {
      log.error(`Failed to update category`, error);
      throw error;
    }
  }

  /**
   * Get email by ID
   */
  async getEmailById(emailId: string): Promise<Email | null> {
    try {
      const result = await this.client.get({
        index: this.indexName,
        id: emailId
      });

      return result.body._source as Email;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      log.error('Failed to get email', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<StatsResponse> {
    try {
      const countResult = await this.client.count({
        index: this.indexName
      });

      const aggResult = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          aggs: {
            by_category: {
              terms: { field: 'aiCategory', size: 10 }
            },
            by_account: {
              terms: { field: 'accountId', size: 10 }
            },
            by_folder: {
              terms: { field: 'folder', size: 10 }
            }
          }
        }
      });

      return {
        totalEmails: countResult.body.count,
        byCategory: aggResult.body.aggregations?.by_category,
        byAccount: aggResult.body.aggregations?.by_account,
        byFolder: aggResult.body.aggregations?.by_folder
      };
    } catch (error) {
      log.error('Failed to get stats', error);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      log.info('✅ Elasticsearch connection successful');
      return true;
    } catch (error) {
      log.error('❌ Elasticsearch connection failed', error);
      return false;
    }
  }

  /**
   * Close client
   */
  async close(): Promise<void> {
    await this.client.close();
    log.info('Elasticsearch client closed');
  }
}