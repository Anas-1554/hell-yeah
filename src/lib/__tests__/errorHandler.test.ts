/**
 * Tests for the comprehensive error handling utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler, errorHandler } from '../errorHandler';
import type { FormSubmissionPayload } from '../../types/googleSheets';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    logSubmissionFailure: vi.fn(),
    error: vi.fn(),
    logRetryAttempt: vi.fn(),
    logAuthentication: vi.fn(),
    warn: vi.fn(),
    critical: vi.fn(),
    logFallbackActivated: vi.fn(),
    info: vi.fn(),
    logPerformance: vi.fn()
  }
}));

const { logger } = await import('../logger');
const mockLogger = logger as any;

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      const instance = ErrorHandler.getInstance();
      expect(errorHandler).toBe(instance);
    });
  });

  describe('Error Classification', () => {
    it('should classify authentication errors', () => {
      const authErrors = [
        new Error('unauthorized access'),
        new Error('invalid_grant token'),
        new Error('authentication failed'),
        new Error('invalid credentials provided')
      ];

      authErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('authentication');
      });
    });

    it('should classify network errors', () => {
      const networkErrors = [
        new Error('network timeout'),
        new Error('connection refused'),
        new Error('ENOTFOUND error'),
        new Error('ECONNRESET occurred')
      ];

      networkErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('network');
      });
    });

    it('should classify rate limit errors', () => {
      const rateLimitErrors = [
        new Error('rate limit exceeded'),
        new Error('quota exceeded for today'),
        new Error('too many requests'),
        new Error('HTTP 429 error')
      ];

      rateLimitErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('rate_limit');
      });
    });

    it('should classify validation errors', () => {
      const validationErrors = [
        new Error('validation failed'),
        new Error('invalid data format'),
        new Error('bad request received'),
        new Error('HTTP 400 error')
      ];

      validationErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('validation');
      });
    });

    it('should classify permission errors', () => {
      const permissionErrors = [
        new Error('permission denied'),
        new Error('forbidden access'),
        new Error('access denied to resource'),
        new Error('HTTP 403 error')
      ];

      permissionErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('permission');
      });
    });

    it('should classify server errors', () => {
      const serverErrors = [
        new Error('internal server error'),
        new Error('service unavailable'),
        new Error('HTTP 500 error'),
        new Error('HTTP 502 bad gateway')
      ];

      serverErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('server');
      });
    });

    it('should classify unknown errors', () => {
      const unknownErrors = [
        new Error('some random error'),
        new Error('unexpected issue'),
        new Error('')
      ];

      unknownErrors.forEach(error => {
        expect(errorHandler.classifyError(error)).toBe('unknown');
      });
    });
  });

  describe('Retry Logic', () => {
    it('should identify retryable errors', () => {
      const retryableCategories = ['network', 'rate_limit', 'server', 'quota'];
      retryableCategories.forEach(category => {
        expect(errorHandler.isRetryable(category as any)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableCategories = ['authentication', 'validation', 'permission', 'unknown'];
      nonRetryableCategories.forEach(category => {
        expect(errorHandler.isRetryable(category as any)).toBe(false);
      });
    });

    it('should calculate retry delays with exponential backoff', () => {
      expect(errorHandler.calculateRetryDelay(1, 'network')).toBe(1000); // 1s
      expect(errorHandler.calculateRetryDelay(2, 'network')).toBe(2000); // 2s
      expect(errorHandler.calculateRetryDelay(3, 'network')).toBe(4000); // 4s
    });

    it('should use longer delays for rate limiting', () => {
      expect(errorHandler.calculateRetryDelay(1, 'rate_limit')).toBe(5000); // 5s
      expect(errorHandler.calculateRetryDelay(2, 'rate_limit')).toBe(10000); // 10s
    });
  });

  describe('Error Context Creation', () => {
    it('should create proper error context', () => {
      const formData: FormSubmissionPayload = {
        timestamp: '2024-01-01T00:00:00.000Z',
        name: 'Test User',
        contactMethods: ['email'],
        email: 'test@example.com',
        socialPlatforms: ['instagram'],
        socialMediaHandle: '@testuser'
      };

      const context = errorHandler.createErrorContext(
        'sub_123',
        'test_operation',
        formData,
        2
      );

      expect(context.submissionId).toBe('sub_123');
      expect(context.operation).toBe('test_operation');
      expect(context.formData).toEqual(formData);
      expect(context.attemptNumber).toBe(2);
      expect(context.timestamp).toBeDefined();
      expect(new Date(context.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    const mockFormData: FormSubmissionPayload = {
      timestamp: '2024-01-01T00:00:00.000Z',
      name: 'Test User',
      contactMethods: ['email'],
      email: 'test@example.com',
      socialPlatforms: ['instagram'],
      socialMediaHandle: '@testuser'
    };

    it('should handle retryable errors correctly', async () => {
      const networkError = new Error('network timeout');
      const context = errorHandler.createErrorContext('sub_123', 'test_op', mockFormData, 1);

      const result = await errorHandler.handleError(networkError, context);

      expect(result.shouldRetry).toBe(true);
      expect(result.retryDelay).toBe(1000);
      expect(result.fallbackActivated).toBe(false);
      expect(result.userMessage).toBe('Form submitted successfully');
      expect(result.loggedForRecovery).toBe(true);

      expect(mockLogger.logSubmissionFailure).toHaveBeenCalledWith(
        'sub_123',
        networkError,
        mockFormData,
        1,
        true
      );
    });

    it('should handle non-retryable errors correctly', async () => {
      const authError = new Error('unauthorized access');
      const context = errorHandler.createErrorContext('sub_456', 'auth_op', mockFormData, 1);

      const result = await errorHandler.handleError(authError, context);

      expect(result.shouldRetry).toBe(false);
      expect(result.retryDelay).toBeUndefined();
      expect(result.fallbackActivated).toBe(true);
      expect(result.userMessage).toBe('Form submitted successfully');
      expect(result.loggedForRecovery).toBe(true);

      expect(mockLogger.logAuthentication).toHaveBeenCalledWith(
        false,
        authError,
        expect.objectContaining({
          submissionId: 'sub_456',
          operation: 'auth_op'
        })
      );
    });

    it('should not retry after max attempts', async () => {
      const serverError = new Error('internal server error');
      const context = errorHandler.createErrorContext('sub_789', 'server_op', mockFormData, 3);

      const result = await errorHandler.handleError(serverError, context);

      expect(result.shouldRetry).toBe(false);
      expect(result.retryDelay).toBeUndefined();
    });

    it('should activate fallbacks for authentication errors', async () => {
      const authError = new Error('invalid credentials');
      const context = errorHandler.createErrorContext('sub_auth', 'auth_test', mockFormData);

      const result = await errorHandler.handleError(authError, context);

      expect(result.fallbackActivated).toBe(true);
      expect(mockLogger.logAuthentication).toHaveBeenCalled();
      expect(mockLogger.logFallbackActivated).toHaveBeenCalledWith(
        'authentication error',
        'sub_auth',
        expect.objectContaining({
          operation: 'auth_test'
        })
      );
    });

    it('should activate fallbacks for permission errors', async () => {
      const permError = new Error('permission denied');
      const context = errorHandler.createErrorContext('sub_perm', 'perm_test', mockFormData);

      const result = await errorHandler.handleError(permError, context);

      expect(result.fallbackActivated).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission denied - manual intervention required',
        permError,
        expect.objectContaining({
          submissionId: 'sub_perm',
          suggestion: 'Verify service account has edit access to the spreadsheet'
        }),
        'perm_test',
        'sub_perm'
      );
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('usage limit exceeded');
      const context = errorHandler.createErrorContext('sub_quota', 'quota_test', mockFormData);

      const result = await errorHandler.handleError(quotaError, context);

      expect(result.shouldRetry).toBe(true); // Quota errors are retryable
      expect(result.fallbackActivated).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'API quota exceeded - data logged for later retry',
        expect.objectContaining({
          submissionId: 'sub_quota',
          formData: mockFormData
        }),
        'quota_test',
        'sub_quota'
      );
    });
  });

  describe('Success and Performance Logging', () => {
    it('should log successful operations', () => {
      errorHandler.logSuccess('test_operation', 'sub_success', 1500, { key: 'value' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'test_operation completed successfully',
        expect.objectContaining({
          duration: '1500ms',
          key: 'value'
        }),
        'test_operation',
        'sub_success'
      );
    });

    it('should log performance metrics', () => {
      const startTime = Date.now() - 2000; // 2 seconds ago
      errorHandler.logPerformance('api_call', startTime, 'sub_perf', { endpoint: '/test' });

      expect(mockLogger.logPerformance).toHaveBeenCalled();
      // The exact duration will vary, so we just check that it was called
    });
  });

  describe('Manual Recovery Logging', () => {
    it('should log data for manual recovery', () => {
      const formData: FormSubmissionPayload = {
        timestamp: '2024-01-01T00:00:00.000Z',
        name: 'Recovery User',
        contactMethods: ['phone'],
        phone: '555-1234',
        socialPlatforms: ['tiktok'],
        socialMediaHandle: '@recovery'
      };

      const error = new Error('Critical failure');
      errorHandler.logForManualRecovery('sub_recovery', formData, error, 'critical_op');

      expect(mockLogger.critical).toHaveBeenCalledWith(
        'Manual data recovery required',
        error,
        expect.objectContaining({
          submissionId: 'sub_recovery',
          operation: 'critical_op',
          recoveryData: expect.objectContaining({
            name: 'Recovery User',
            phone: '555-1234',
            socialMediaHandle: '@recovery'
          }),
          instructions: 'Use recoveryData to manually add this submission to the spreadsheet'
        }),
        'manual_recovery',
        'sub_recovery'
      );
    });
  });
});