import React, { useState, useEffect } from 'react';
import './App.css';
import { emailApi, Email, Account, SearchParams } from './services/api';

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    'All',
    'Interested',
    'Meeting Booked',
    'Not Interested',
    'Spam',
    'Out of Office',
    'Uncategorized'
  ];

  // Load initial data
  useEffect(() => {
    loadAccounts();
    loadStats();
    loadEmails();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await emailApi.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await emailApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    try {
      const params: SearchParams = {
        limit: 50
      };

      if (searchQuery) params.query = searchQuery;
      if (selectedAccount) params.accountId = selectedAccount;
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }

      const result = await emailApi.search(params);
      setEmails(result.emails);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadEmails();
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
      'Interested': '#10b981',
      'Meeting Booked': '#3b82f6',
      'Not Interested': '#ef4444',
      'Spam': '#f59e0b',
      'Out of Office': '#8b5cf6',
      'Uncategorized': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>📬 ReachInbox Onebox</h1>
        <p>AI-Powered Email Management</p>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value">{stats.totalEmails}</div>
            <div className="stat-label">Total Emails</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{accounts.length}</div>
            <div className="stat-label">Accounts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.byCategory?.buckets?.find((b: any) => b.key === 'Interested')?.doc_count || 0}
            </div>
            <div className="stat-label">Interested Leads</div>
          </div>
        </div>
      )}

      <div className="container">
        {/* Sidebar - Filters */}
        <aside className="sidebar">
          <div className="filter-section">
            <h3>🔍 Search</h3>
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button onClick={handleSearch} className="btn-primary">
              Search
            </button>
          </div>

          <div className="filter-section">
            <h3>📧 Account</h3>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setTimeout(loadEmails, 100);
              }}
              className="filter-select"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h3>🏷️ Category</h3>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setTimeout(loadEmails, 100);
                }}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                style={{
                  borderLeft: cat !== 'All' ? `4px solid ${getCategoryColor(cat)}` : 'none'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Email List */}
          <div className="email-list">
            <h2>
              Emails {loading && <span className="loading">Loading...</span>}
            </h2>

            {emails.length === 0 && !loading && (
              <div className="empty-state">
                <p>No emails found</p>
              </div>
            )}

            {emails.map((email) => (
              <div
                key={email.id}
                className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="email-header">
                  <div className="email-from">
                    <strong>{email.from.name || email.from.address}</strong>
                  </div>
                  <div className="email-date">{formatDate(email.date)}</div>
                </div>
                <div className="email-subject">{email.subject}</div>
                <div className="email-preview">
                  {email.body.substring(0, 100)}...
                </div>
                <div className="email-footer">
                  <span
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(email.aiCategory) }}
                  >
                    {email.aiCategory}
                  </span>
                  {email.aiConfidence && (
                    <span className="confidence">
                      {(email.aiConfidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Email Detail Panel */}
          {selectedEmail && (
            <div className="email-detail">
              <button className="close-btn" onClick={() => setSelectedEmail(null)}>
                ✕
              </button>
              <div className="detail-header">
                <h2>{selectedEmail.subject}</h2>
                <span
                  className="category-badge large"
                  style={{ backgroundColor: getCategoryColor(selectedEmail.aiCategory) }}
                >
                  {selectedEmail.aiCategory}
                </span>
              </div>
              <div className="detail-meta">
                <div>
                  <strong>From:</strong> {selectedEmail.from.name || selectedEmail.from.address}
                </div>
                <div>
                  <strong>To:</strong>{' '}
                  {selectedEmail.to.map((t) => t.address).join(', ')}
                </div>
                <div>
                  <strong>Date:</strong> {formatDate(selectedEmail.date)}
                </div>
                <div>
                  <strong>Folder:</strong> {selectedEmail.folder}
                </div>
              </div>
              <div className="detail-body">
                <h3>Email Body:</h3>
                <div className="body-content">{selectedEmail.body}</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;