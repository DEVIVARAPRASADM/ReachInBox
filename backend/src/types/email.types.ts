// Type definitions for the ReachInbox Onebox system
// Created: 2024

export enum EmailCategory {
  INTERESTED = 'Interested',
  MEETING_BOOKED = 'Meeting Booked',
  NOT_INTERESTED = 'Not Interested',
  SPAM = 'Spam',
  OUT_OF_OFFICE = 'Out of Office',
  UNCATEGORIZED = 'Uncategorized'
}

// Main email interface
export interface Email {
  id: string;
  // name:Name;
  accountId: string;
  messageId: string;
  uid: number;
  folder: string;
  
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  body: string;
  htmlBody?: string;
  
  date: Date;
  indexedAt: Date;
  
  aiCategory: EmailCategory;
  aiConfidence?: number;
  
  flags: string[];
  hasAttachments: boolean;
  attachments?: Attachment[];
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
}

// Email account configuration
export interface EmailAccountConfig {
  id: string;
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  label?: string;
}

// IMAP configuration
export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
  connTimeout?: number;
  authTimeout?: number;
  keepalive?: {
    interval: number;
    idleInterval: number;
    forceNoop: boolean;
  };
}

// Search parameters
export interface EmailSearchParams {
  query?: string;
  accountId?: string;
  folder?: string;
  category?: EmailCategory;
  from?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

// Search results
export interface EmailSearchResult {
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
  took: number;
}

// AI categorization result
export interface AiCategorizationResult {
  category: EmailCategory;
  confidence: number;
  reasoning?: string;
}

// RAG context for reply generation
export interface RagContext {
  productName: string;
  meetingLink: string;
  description: string;
  relevantChunks: string[];
}

// Suggested reply
export interface SuggestedReply {
  reply: string;
  confidence: number;
  contextUsed: string[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StatsResponse {
  totalEmails: number;
  byCategory: any;
  byAccount: any;
  byFolder: any;
}