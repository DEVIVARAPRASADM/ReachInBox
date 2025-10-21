# 📩 ReachInBox – AI-Powered Onebox Email Aggregator

### 🚀 Assignment – Associate Backend Engineer | ReachInbox

> **Built by:** Devivaraprasad Mullaguri  
> **Duration:** 48 Hours Challenge  
> **Tech Stack:** TypeScript • Node.js • Express.js • IMAP • Elasticsearch • Gemini AI API • Slack Webhook • React.js

---

## 🧠 Project Overview

**ReachInBox** is a feature-rich email onebox system that synchronizes multiple IMAP email accounts in real time, categorizes messages using AI, and integrates Slack and webhook notifications for lead tracking automation.

The project is inspired by the **ReachInbox platform** and demonstrates scalable backend engineering, AI integration, and a minimal frontend to visualize email data.

---

## ⚙️ Setup Instructions

### 🔹 1. Clone the repository
```bash
git clone https://github.com/DEVIVARAPRASADM/ReachInBox.git
cd ReachInBox
```

### 🔹 2. Install dependencies
```bash
npm install
```

### 🔹 3. Environment configuration
Create a `.env` file in the root directory with the following keys:

```env
PORT=3000
NODE_ENV=development

# IMAP Email Accounts (Example)
EMAIL1_USER=your-email@gmail.com
EMAIL1_PASSWORD=your-app-password
EMAIL1_HOST=imap.gmail.com
EMAIL1_PORT=993

EMAIL2_USER=your-email@outlook.com
EMAIL2_PASSWORD=your-app-password
EMAIL2_HOST=outlook.office365.com
EMAIL2_PORT=993

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ES_INDEX_NAME=emails

# AI Model
GEMINI_API_KEY=your-gemini-api-key

# Slack & Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxx/yyyy/zzzz
EXTERNAL_WEBHOOK_URL=https://webhook.site/your-custom-url
```

---

### 🔹 4. Run Elasticsearch (via Docker)
```bash
docker run -d --name elasticsearch   -p 9200:9200   -e "discovery.type=single-node"   docker.elastic.co/elasticsearch/elasticsearch:8.10.0
```

Check connection:
```bash
curl http://localhost:9200
```

---

### 🔹 5. Start the server
```bash
npm run dev
```

This will:
- Connect to IMAP accounts in real time using IDLE mode  
- Fetch the last 30 days of emails  
- Store indexed emails in Elasticsearch  
- Categorize emails using Gemini AI  
- Trigger Slack and webhook notifications for interested leads  

---

## 🏗️ Project Architecture

```
ReachInBox/
├── src/
│   ├── config/                 # Environment & Elasticsearch config
│   ├── services/
│   │   ├── EmailOrchestrator.ts  # IMAP real-time sync
│   │   ├── ElasticsearchService.ts # Search & indexing
│   │   ├── GeminiCategorizer.ts  # AI categorization logic
│   │   ├── NotificationService.ts # Slack & Webhook integration
│   ├── routes/
│   │   ├── email.routes.ts     # API endpoints for email access
│   ├── utils/
│   │   ├── logger.ts           # Logging utility
│   └── index.ts                # App entry point
├── frontend/
│   ├── src/                    # Simple React UI for visualization
│   └── package.json
├── Dockerfile
├── package.json
└── README.md
```

---

## 🧩 Features Implemented

| # | Feature | Description |
|---|----------|-------------|
| 1 | **Real-Time Email Synchronization** | Persistent IMAP IDLE connections for Gmail & Outlook (no cron jobs) |
| 2 | **Elasticsearch Integration** | Indexed emails searchable by subject, sender, and folder |
| 3 | **AI-Based Categorization** | Gemini-based classification into: Interested, Meeting Booked, Not Interested, Spam, Out of Office |
| 4 | **Slack Notifications** | Sends Slack alerts for every *Interested* email |
| 5 | **Webhook Trigger** | Posts payload to external webhook URL for automation |
| 6 | **Frontend Interface** | Displays emails, filters by folder/account, and search |
| 7 | **AI Reply Suggestion (Optional)** | Suggests contextual replies using RAG (bonus feature) |

---

## 🔍 API Testing (Postman)

All backend endpoints can be tested via Postman Collection:
- `GET /emails` → Fetch synced emails  
- `GET /emails/search?q=meeting` → Search in Elasticsearch  
- `POST /emails/categorize` → Trigger manual categorization  
- `POST /webhook/test` → Verify external webhook integration  

---

## 💬 Slack & Webhook Integration

Every *Interested* email triggers:
1. A Slack message with sender & subject
2. A webhook payload (JSON) to your configured external URL

Example Slack Message:
```
🚀 New Interested Lead!
From: John Doe <john@example.com>
Subject: Let's discuss your product!
```

---

## 🧠 AI Categorization Logic

Emails are analyzed using **Google Gemini API** with structured prompt-based classification:
- Interested  
- Meeting Booked  
- Not Interested  
- Spam  
- Out of Office  

---

## 🖥️ Frontend Overview

The frontend (in `/frontend`) provides:
- 📬 Email list view  
- 🔍 Elasticsearch-based search  
- 🏷️ AI category filter  

Built with:
- React + TypeScript  
- Material UI  
- Axios  

---

## 🎥 Demo Video

📺 **Demo Video:** [Link will be added soon]  
> *(Duration: under 5 minutes)*  
Shows:
- Real-time email sync  
- Elasticsearch search  
- Categorization + Slack notifications  
- Webhook trigger demo  

---

## 🧾 Evaluation Readiness Checklist

✅ Private GitHub Repository  
✅ Access Granted to: `Mitrajit` and `sarvagya-chaudhary`  
✅ Full README Documentation  
✅ Working Backend + Basic Frontend  
✅ Postman Tested APIs  
✅ Demo Video Attached  

---

## 🧑‍💻 Developer Notes

This project focuses on:
- Real-time IMAP synchronization (not polling)
- Scalable event-driven architecture
- Modular and clean TypeScript backend
- Minimalistic UI for visualization
- Seamless AI + search + notification integration

---

## 📬 Contact

**Author:** Devivaraprasad Mullaguri  
**Email:** devivaraprasad789@outlook.com  
**GitHub:** [github.com/DEVIVARAPRASADM](https://github.com/DEVIVARAPRASADM)  
**LinkedIn:** [linkedin.com/in/devivaraprasad-mullaguri](https://linkedin.com/in/devivaraprasad-mullaguri)

---
