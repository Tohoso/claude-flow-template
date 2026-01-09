import cron from 'node-cron';
import { config } from './config/index.js';
import { GoogleDriveAdapter } from './adapters/google-drive.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { FreeeAdapter } from './adapters/freee.js';
import { ReceiptProcessor } from './services/receipt-processor.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('main');

async function main() {
  logger.info('Starting freee-receipt-flow');

  // アダプターを初期化
  const driveAdapter = new GoogleDriveAdapter(config.googleDrive);
  const geminiAdapter = new GeminiAdapter(config.gemini);
  const freeeAdapter = new FreeeAdapter(config.freee);

  try {
    await driveAdapter.initialize();
    await freeeAdapter.initialize();
  } catch (error) {
    logger.error({ error }, 'Failed to initialize adapters');
    process.exit(1);
  }

  // プロセッサーを初期化
  const processor = new ReceiptProcessor(
    driveAdapter,
    geminiAdapter,
    freeeAdapter,
    config.freee.companyId
  );

  // 初回実行
  logger.info('Running initial processing');
  try {
    const results = await processor.processAll();
    logger.info({ results }, 'Initial processing completed');
  } catch (error) {
    logger.error({ error }, 'Initial processing failed');
  }

  // 定期実行をスケジュール
  logger.info({ schedule: config.cronSchedule }, 'Scheduling periodic processing');
  cron.schedule(config.cronSchedule, async () => {
    logger.info('Running scheduled processing');
    try {
      const results = await processor.processAll();
      logger.info({ results }, 'Scheduled processing completed');
    } catch (error) {
      logger.error({ error }, 'Scheduled processing failed');
    }
  });

  logger.info('freee-receipt-flow is running. Press Ctrl+C to stop.');

  // グレースフルシャットダウン
  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});
