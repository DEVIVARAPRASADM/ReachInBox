import { Router } from 'express';
import { EmailController } from '../controllers/EmailController';
import { ElasticsearchClient } from '../services/elasticsearch/ElasticsearchClient';
// import { ElasticsearchClient } from '../ElasticsearchClient';


export function createRoutes(esClient: ElasticsearchClient): Router {
  const router = Router();
  const emailController = new EmailController(esClient);

  // Health check
  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'API is running' });
  });

  // Email routes
  router.get('/emails', (req, res) => emailController.getAllEmails(req, res));
  router.get('/emails/search', (req, res) => emailController.searchEmails(req, res));
  router.get('/emails/stats', (req, res) => emailController.getStats(req, res));
  router.get('/emails/:id', (req, res) => emailController.getEmailById(req, res));

  // Account routes
  router.get('/accounts', (req, res) => emailController.getAccounts(req, res));

  return router;
}