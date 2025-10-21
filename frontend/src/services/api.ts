import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Email {
  id: string;
  accountId: string;
  subject: string;
  body: string;
  from: {
    name?: string;
    address: string;
  };
  to: Array<{
    name?: string;
    address: string;
  }>;
  date: string;
  aiCategory: string;
  aiConfidence?: number;
  folder: string;
  hasAttachments: boolean;
}

export interface SearchParams {
  query?: string;
  accountId?: string;
  folder?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
  took: number;
}

export interface Account {
  id: string;
  user: string;
  label: string;
}

export interface Stats {
  totalEmails: number;
  byCategory: any;
  byAccount: any;
}

// API Methods
export const emailApi = {
  // Get all emails
  getAll: async (limit = 20, offset = 0): Promise<SearchResult> => {
    const response = await api.get(`/emails?limit=${limit}&offset=${offset}`);
    return response.data.data;
  },

  // Search emails
  search: async (params: SearchParams): Promise<SearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append('q', params.query);
    if (params.accountId) queryParams.append('account', params.accountId);
    if (params.folder) queryParams.append('folder', params.folder);
    if (params.category) queryParams.append('category', params.category);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get(`/emails/search?${queryParams.toString()}`);
    return response.data.data;
  },

  // Get single email
  getById: async (id: string): Promise<Email> => {
    const response = await api.get(`/emails/${id}`);
    return response.data.data;
  },

  // Get stats
  getAccounts: async (): Promise<Account[]> => {
    const response = await api.get('/accounts');
    return response.data.data; // pick array directly
  },

  // Get stats
  getStats: async (): Promise<Stats> => {
    const response = await api.get('/emails/stats');
    return response.data.data; // pick stats object
  },

};

export default api;