import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { EmailAccountConfig, Email, EmailCategory } from '../../types/email.types';
import { log } from '../../utils/logger';

export class ImapConnectionManager extends EventEmitter {
  private connections = new Map<string, Imap>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private isShuttingDown = false;

  constructor() {
    super();
    log.info('ImapConnectionManager initialized');
  }

  async connect(account: EmailAccountConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      log.info(`Connecting to ${account.label} (${account.user})...`);

      const imap = new Imap({
        user: account.user,
        password: account.password,
        host: account.host,
        port: account.port,
        tls: account.tls,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 30000,
        keepalive: { interval: 10000, idleInterval: 300000, forceNoop: true }
      });

      imap.once('ready', () => {
        log.info(`✅ Connected: ${account.label}`);
        this.connections.set(account.id, imap);
        this.monitorInbox(account, imap);
        resolve();
      });

      imap.once('error', (err) => {
        log.error(`Connection error for ${account.label}`, err);
        this.handleReconnect(account);
        reject(err);
      });

      imap.once('end', () => {
        log.warn(`Connection ended: ${account.label}`);
        if (!this.isShuttingDown) this.handleReconnect(account);
      });

      imap.connect();
    });
  }

  /** Start monitoring inbox for new emails */
  private monitorInbox(account: EmailAccountConfig, imap: Imap) {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) return log.error(`Failed to open INBOX for ${account.label}`, err);

      log.imapEvent(account.id, `Monitoring INBOX (${box.messages.total} messages)`);

      // 'mail' event fires for new messages
      imap.on('mail', () => this.fetchNewEmails(account, imap));
      imap.on('update', (seqno) => log.debug(`Email updated: ${seqno}`));
    });
  }

  /** Fetch new emails when 'mail' event fires */
  private async fetchNewEmails(account: EmailAccountConfig, imap: Imap) {
    try {
      imap.search(['UNSEEN'], (err, results) => {
        if (err) {
          log.error('Search error', err);
          return;
        }

        if (!results.length) return;

        log.imapEvent(account.id, `Fetching ${results.length} new emails`);
        this.fetchEmails(imap, results, account);
      });
    } catch (err) {
      log.error('Error in fetchNewEmails', err);
    }
  }

  private fetchEmails(imap: Imap, uids: number[], account: EmailAccountConfig) {
    const fetch = imap.fetch(uids, { bodies: '', struct: true, markSeen: false });

    fetch.on('message', (msg) => this.processMessage(msg, account));
    fetch.once('error', (err) => log.error('Fetch error', err));
    fetch.once('end', () => log.debug('Finished fetching emails'));
  }

  private processMessage(msg: any, account: EmailAccountConfig) {
    let buffer = '';
    let attrs: any;

    msg.on('body', (stream: any) => {
      stream.on('data', (chunk: Buffer) => (buffer += chunk.toString('utf8')));
    });

    msg.once('attributes', (a: any) => (attrs = a));

    msg.once('end', async () => {
      try {
        const parsed: ParsedMail = await simpleParser(buffer);
        const email = this.convertToEmail(parsed, attrs, account);
        this.emit('newEmail', email);
        log.emailReceived(email.subject, email.from.address);
      } catch (err) {
        log.error('Error parsing email', err);
      }
    });
  }

  private convertToEmail(parsed: ParsedMail, attrs: any, account: EmailAccountConfig): Email {
    const parseAddressList = (address: any): { name?: string; address: string }[] => {
      if (!address) return [];

      if (Array.isArray(address)) 
        return address.map((a: { name?: string; address: string }) => ({ name: a.name, address: a.address }));

      if (address.value && Array.isArray(address.value)) 
        return address.value.map((a: { name?: string; address: string }) => ({ name: a.name, address: a.address }));

      return [{ name: address.name, address: address.address }];
    };

    const fromAddress = parsed.from?.value?.[0] || { address: 'unknown@unknown.com' };

    return {
      id: uuidv4(),
      accountId: account.id,
      messageId: parsed.messageId || uuidv4(),
      uid: attrs.uid,
      folder: 'INBOX',
      from: { address: fromAddress.address || 'unknown@unknown.com' },
      to: parseAddressList(parsed.to),
      cc: parseAddressList(parsed.cc),
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      indexedAt: new Date(),
      aiCategory: EmailCategory.UNCATEGORIZED,
      aiConfidence: 0,
      flags: attrs.flags || [],
      hasAttachments: (parsed.attachments?.length || 0) > 0,
      attachments: parsed.attachments?.map(att => ({
        filename: att.filename || 'unknown',
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0
      }))
    };
  }

  /** Initial sync for last N days */
  async fetchLastNDays(account: EmailAccountConfig, days = 30): Promise<Email[]> {
    return new Promise((resolve) => {
      const imap = this.connections.get(account.id);
      if (!imap) {
        log.warn(`No connection for ${account.id}, skipping sync`);
        resolve([]);
        return;
      }

      log.info(`📥 Fetching last ${days} days for ${account.label}`);

      imap.openBox('INBOX', true, (err) => {
        if (err) {
          log.error('Failed to open inbox for sync', err);
          resolve([]);
          return;
        }

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        imap.search(['ALL', ['SINCE', sinceDate]], (searchErr, results) => {
          if (searchErr) {
            log.error('Search error during sync', searchErr);
            resolve([]);
            return;
          }

          if (!results.length) {
            log.warn(`No emails in last ${days} days`);
            resolve([]);
            return;
          }

          log.info(`Found ${results.length} emails to sync`);
          const emails: Email[] = [];
          const fetch = imap.fetch(results, { bodies: '', struct: true });

          fetch.on('message', (msg) => this.processMessage(msg, account));
          fetch.once('error', (fetchErr) => log.error('Fetch error during sync', fetchErr));
          fetch.once('end', () => {
            log.info(`✅ Synced ${emails.length} emails from ${account.label}`);
            resolve(emails);
          });
        });
      });
    });
  }

  /** Handle reconnects */
  private handleReconnect(account: EmailAccountConfig) {
    if (this.isShuttingDown) return;

    const existingTimer = this.reconnectTimers.get(account.id);
    if (existingTimer) clearTimeout(existingTimer);

    log.warn(`Will reconnect ${account.label} in 10 seconds`);

    const timer = setTimeout(() => {
      log.info(`Reconnecting ${account.label}...`);
      this.connect(account).catch(err => log.error(`Reconnection failed for ${account.label}`, err));
    }, 10000);

    this.reconnectTimers.set(account.id, timer);
  }

  isConnected(accountId: string): boolean {
    const conn = this.connections.get(accountId);
    return conn?.state === 'authenticated';
  }

  async disconnectAll(): Promise<void> {
    this.isShuttingDown = true;
    log.info('Disconnecting all IMAP connections...');
    this.reconnectTimers.forEach(clearTimeout);
    this.reconnectTimers.clear();
    this.connections.forEach((imap) => imap.end());
    this.connections.clear();
    log.info('✅ All connections closed');
  }
}
