import { Injectable, LoggerService } from "@nestjs/common";

@Injectable()
export class RetryService {
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly jitterFactor: number;

  constructor(
    private readonly logger: LoggerService,
    maxRetries = 3,
    retryDelayMs = 1000,
    jitterFactor = 0.5,
  ) {
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.jitterFactor = jitterFactor;
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelayMs?: number;
      jitterFactor?: number;
      isRetryable?: (err: any) => boolean;
    }
  ): Promise<T> {
    const retries = options?.maxRetries ?? this.maxRetries;
    const delay = options?.retryDelayMs ?? this.retryDelayMs;
    const jitter = options?.jitterFactor ?? this.jitterFactor;
    const isRetryable = options?.isRetryable ?? RetryService.isRetryableError;

    let attempt = 0;
    let lastError: any;

    while (attempt < retries) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        attempt++;

        const errorMessage = `Attempt #${attempt} failed: ${JSON.stringify(err)}`;

        if (!isRetryable(err)) {
          this.logger.error(`Non-retryable error encountered: ${errorMessage}`);
          throw err;
        }

        this.logger.warn(errorMessage);

        if (attempt < retries) {
          const jitteredDelay = delay + Math.random() * jitter * delay;
          await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
        }
      }
    }

    this.logger.error(`All ${retries} attempts failed. Last error: ${JSON.stringify(lastError)}`);
    throw new Error(`Operation failed after ${retries} attempts.`);
  }

  private static isRetryableError(err: any): boolean {
    if (!err || typeof err !== 'object') return false;

    const retryableErrorCodes = [
      'TimeoutError',
      'ECONNRESET',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ENOTFOUND',
      'ECONNREFUSED',
      'EPIPE',
      'Throttling',
      'TooManyRequestsException',
      'SlowDown',
      'RequestTimeout',
    ];

    const retryableStatusCodes = [429, 500, 502, 503, 504];

    const code = err.code ?? err.name ?? err.errorCode;
    const statusCode =
      err.statusCode ??
      err.$metadata?.httpStatusCode ??
      err.response?.status;

    return (
      retryableErrorCodes.includes(code) ||
      retryableStatusCodes.includes(statusCode)
    );
  }
}
