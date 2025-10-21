import { App } from './app';
import { config } from './config/env.config';
import { log } from './utils/logger';

/**
 * Main server entry point
 */
async function startServer() {
  try {
    log.info('='.repeat(50));
    log.info('🚀 ReachInbox Onebox - Starting Server');
    log.info('='.repeat(50));

    const app = new App();
    
    // Initialize the app
    await app.initialize();

    // Start listening
    const server = app.app.listen(config.PORT, () => {
      log.info('='.repeat(50));
      log.info(`✅ Server running on port ${config.PORT}`);
      log.info(`📡 API: http://localhost:${config.PORT}/api`);
      log.info(`🏥 Health: http://localhost:${config.PORT}/api/health`);
      log.info('='.repeat(50));
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      log.info('SIGTERM received, shutting down...');
      server.close();
      await app.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      log.info('\nSIGINT received, shutting down...');
      server.close();
      await app.shutdown();
      process.exit(0);
    });

  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();