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
    maxRetries?: number,
    retryDelayMs?: number,
    jitterFactor?: number
  ): Promise<T> {
    const retries = maxRetries || this.maxRetries;
    const delay = retryDelayMs || this.retryDelayMs;
    const jitter = jitterFactor || this.jitterFactor;
    let attempt = 0;
    let failedAfterSeveralAttempsMessage = "";

    while (attempt < retries) {
      try {
        const result = await operation();
        return result;
      } catch (err) {
        attempt++;
        failedAfterSeveralAttempsMessage = `Failed after attempt #: ${attempt}`;

        this.logger.error(
          `Failed on attempt #: ${attempt}. Error: ${JSON.stringify(err)}`
        );

        if (attempt < retries) {
          const jitteredDelay = delay + Math.random() * jitter * delay;
          await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
        } else {
          this.logger.error(failedAfterSeveralAttempsMessage);
          throw new Error(failedAfterSeveralAttempsMessage);
        }
      }
    }

    this.logger.error(failedAfterSeveralAttempsMessage);
    throw new Error(failedAfterSeveralAttempsMessage);
  }
}
