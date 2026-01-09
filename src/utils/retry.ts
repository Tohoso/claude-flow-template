import { createLogger } from './logger.js';

const logger = createLogger('retry');

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number[];
  retryableErrors: string[];
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'RATE_LIMIT', 'ENOTFOUND'],
};

function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof Error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode && retryableErrors.includes(errorCode)) {
      return true;
    }
    // Check for rate limit in message
    if (error.message.toLowerCase().includes('rate limit')) {
      return true;
    }
    // Check for 429 status code
    if (error.message.includes('429')) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig,
  operationName = 'operation'
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= config.maxRetries) {
        logger.error({ error, attempt, operationName }, `${operationName} failed after all retries`);
        throw error;
      }

      if (!isRetryableError(error, config.retryableErrors)) {
        logger.error({ error, operationName }, `${operationName} failed with non-retryable error`);
        throw error;
      }

      const backoffTime = config.backoffMs[attempt] || config.backoffMs[config.backoffMs.length - 1];
      logger.warn(
        { error, attempt, backoffTime, operationName },
        `${operationName} failed, retrying in ${backoffTime}ms`
      );
      await sleep(backoffTime);
    }
  }

  throw lastError;
}
