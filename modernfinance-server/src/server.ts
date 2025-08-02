import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { logger } from './utils/logger';
import config from './config/app.config';
import { connectRedis } from './config/redis.config';

// Graceful shutdown handling
let isShuttingDown = false;
const httpServer = createServer(app);

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');

    // Start HTTP server
    const PORT = config.port;
    const HOST = '0.0.0.0'; // Bind to all interfaces for container deployment

    httpServer.listen(PORT, HOST, () => {
      logger.info(`Server running at http://${HOST}:${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Node version: ${process.version}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  
  isShuttingDown = true;
  logger.info(`${signal} signal received: closing HTTP server`);

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Give ongoing requests 30 seconds to complete
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);

  try {
    // Close Redis connection
    const { redis } = await import('./config/redis.config');
    await redis.quit();
    logger.info('Redis connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();