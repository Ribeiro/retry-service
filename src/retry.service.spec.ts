import { LoggerService } from '@nestjs/common';
import { RetryService } from './retry.service';

describe('RetryService', () => {
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

  it('should be defined', () => {
    expect(retryService).toBeDefined();
  });

  it('should call operation once if it succeeds on the first attempt', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');

    const result = await retryService.retryOperation(mockOperation);

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should retry the operation on failure and succeed on the second attempt', async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce('success');

    const result = await retryService.retryOperation(mockOperation);

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result).toBe('success');
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed on attempt #: 1. Error: {}'
    );
  });

  it('should retry the operation up to maxRetries and fail if all attempts fail', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Failed'));

    await expect(retryService.retryOperation(mockOperation)).rejects.toThrow(
      'Failed after attempt #: 3'
    );
    expect(mockOperation).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledTimes(4);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed on attempt #: 1. Error: {}'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed on attempt #: 2. Error: {}'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
       'Failed on attempt #: 3. Error: {}'
    );
  });

  it('should respect custom maxRetries, retryDelayMs, and jitterFactor', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    const maxRetries = 2;
    const retryDelayMs = 500;
    const jitterFactor = 0.2;

    const result = await retryService.retryOperation(
      mockOperation,
      maxRetries,
      retryDelayMs,
      jitterFactor
    );

    expect(mockOperation).toHaveBeenCalledTimes(1); // Should succeed on the first attempt
    expect(result).toBe('success');
  });

  it('should throw an error and log it if the operation fails after all retries with custom delay', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Failed'));
    const maxRetries = 2;
    const retryDelayMs = 500;
    const jitterFactor = 0.2;

    await expect(
      retryService.retryOperation(mockOperation, maxRetries, retryDelayMs, jitterFactor)
    ).rejects.toThrow('Failed after attempt #: 2');

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed on attempt #: 1. Error: {}'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed after attempt #: 2'
    );
  });
});
