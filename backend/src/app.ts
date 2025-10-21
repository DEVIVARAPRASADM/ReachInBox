import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createRoutes } from './routes';
import { EmailOrchestrator } from './services/EmailOrchestrator';
import { log } from './utils/logger';

export class App {
  public app: Application;
  private orchestrator: EmailOrchestrator;

  constructor() {
    this.app = express();
    this.orchestrator = new EmailOrchestrator();
    this.setupMiddleware();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(cors());

    // Body parser
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      log.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    // Initialize orchestrator
    await this.orchestrator.initialize();

    // Setup routes
    const routes = createRoutes(this.orchestrator.getEsClient());
    this.app.use('/api', routes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // Error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      log.error('Server error', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    await this.orchestrator.shutdown();
  }
}