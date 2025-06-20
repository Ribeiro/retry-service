import { LoggerService } from "@nestjs/common";
import { RetryService } from "./retry.service";

describe("RetryService", () => {
  let retryService: RetryService;
  let mockLogger: LoggerService;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
    };
    retryService = new RetryService(mockLogger);
  });

  it("should be defined", () => {
    expect(retryService).toBeDefined();
  });

  it("should call operation once if it succeeds on the first attempt", async () => {
    const mockOperation = jest.fn().mockResolvedValue("success");

    const result = await retryService.retryOperation(mockOperation);

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result).toBe("success");
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it("should retry the operation on failure and succeed on the second attempt", async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce("success");

    const result = await retryService.retryOperation(mockOperation, {
      isRetryable: () => true,
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result).toBe("success");
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Attempt #1 failed")
    );
  });

  it("should retry the operation up to maxRetries and fail if all attempts fail", async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error("Failed"));

    await expect(
      retryService.retryOperation(mockOperation, {
        isRetryable: () => true,
      })
    ).rejects.toThrow("Operation failed after 3 attempts.");

    expect(mockOperation).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("All 3 attempts failed")
    );
  });

  it("should respect custom maxRetries, retryDelayMs, and jitterFactor", async () => {
    const mockOperation = jest.fn().mockResolvedValue("success");

    const result = await retryService.retryOperation(mockOperation, {
      maxRetries: 2,
      retryDelayMs: 500,
      jitterFactor: 0.2,
    });

    expect(mockOperation).toHaveBeenCalledTimes(1); // Should succeed on first attempt
    expect(result).toBe("success");
  });

  it("should throw an error and log it if the operation fails after all retries", async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error("Failed"));

    await expect(
      retryService.retryOperation(mockOperation, {
        maxRetries: 2,
        retryDelayMs: 500,
        jitterFactor: 0.2,
        isRetryable: () => true,
      })
    ).rejects.toThrow("Operation failed after 2 attempts.");

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("All 2 attempts failed")
    );
  });

  it("should stop retrying when isRetryable returns false", async () => {
    const error = new Error("Fatal");
    const mockOperation = jest.fn().mockRejectedValue(error);

    await expect(
      retryService.retryOperation(mockOperation, {
        isRetryable: () => false,
      })
    ).rejects.toThrow(error);

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Non-retryable error encountered")
    );
  });

  it("should stop retrying when isRetryable returns false", async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValue(new Error("Permanent error"));

    const isRetryable = jest.fn().mockReturnValue(false);

    await expect(
      retryService.retryOperation(mockOperation, { isRetryable })
    ).rejects.toThrow("Permanent error");

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(isRetryable).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Non-retryable error encountered")
    );
  });

  it("should continue retrying while isRetryable returns true", async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success");

    const isRetryable = jest.fn().mockReturnValue(true);

    const result = await retryService.retryOperation(mockOperation, {
      maxRetries: 3,
      isRetryable,
    });

    expect(result).toBe("success");
    expect(mockOperation).toHaveBeenCalledTimes(3);
    expect(isRetryable).toHaveBeenCalledTimes(2); // não é chamada no sucesso
  });

  it("should call isRetryable with the actual error", async () => {
    const error = new Error("network glitch");
    const mockOperation = jest.fn().mockRejectedValue(error);

    const isRetryable = jest.fn().mockReturnValue(false);

    await expect(
      retryService.retryOperation(mockOperation, { isRetryable })
    ).rejects.toThrow("network glitch");

    expect(isRetryable).toHaveBeenCalledWith(error);
  });
});
