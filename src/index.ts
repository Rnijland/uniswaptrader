// src/index.ts
import { logger } from './utils/logger';
import { startServer } from './ui/server';

async function main() {
  try {
    logger.info('Starting trading bot...');
    startServer();
  } catch (error: any) {
    logger.error(`Error in main: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in main:', error);
});