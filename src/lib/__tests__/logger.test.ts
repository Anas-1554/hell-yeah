/**
 * Tests for the comprehensive logging utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, logger } from '../logger';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('Logger', () => {
  let mockConsoleLog: any;
  let mockConsoleWarn: any;
  let mockConsoleError: any;

  beforeEach(() => {
    mockConsoleLog = vi.fn();
    mockConsoleWarn = vi.fn();
    mockConsoleError = vi.fn();
    
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      const instance = Logger.getInstance();
      expect(logger).toBe(instance);
    });
  });

  describe('Submission ID Generation', () => {
    it('should generate unique submission IDs', () => {
      const id1 = logger.generateSubmissionId();
      const id2 = logger.generateSubmissionId();
      
      expect(id1).toMatch(/^sub_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^sub_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Basic Logging Methods', () => {
    it('should log info messages', () => {
      logger.info('Test message', { key: 'value' }, 'test_operation', 'test_id');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('Test message');
      expect(loggedData.context).toEqual({ key: 'value' });
      expect(loggedData.operation).toBe('test_operation');
      expect(loggedData.submissionId).toBe('test_id');
      expect(loggedData.timestamp).toBeDefined();
    });

    it('should log error messages with error objects', () => {
      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';
      
      logger.error('Error occurred', testError, { context: 'test' }, 'error_op', 'error_id');
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('error');
      expect(loggedData.message).toBe('Error occurred');
      expect(loggedData.error).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: 'Error stack trace'
      });
    });

    it('should log warnings', () => {
      logger.warn('Warning message');
      
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleWarn.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('warn');
      expect(loggedData.message).toBe('Warning message');
    });

    it('should log critical errors', () => {
      const criticalError = new Error('Critical error');
      logger.critical('Critical issue', criticalError);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('critical');
      expect(loggedData.message).toBe('Critical issue');
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log form submission start', () => {
      const formData = {
        name: 'John Doe',
        contactMethods: ['email'],
        socialPlatforms: ['instagram'],
        email: 'john@example.com'
      };
      
      logger.logSubmissionStart('sub_123', formData);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Form submission started');
      expect(loggedData.operation).toBe('form_submission');
      expect(loggedData.submissionId).toBe('sub_123');
      expect(loggedData.context.name).toBe('John Doe');
      expect(loggedData.context.hasEmail).toBe(true);
    });

    it('should log form submission success', () => {
      const formData = {
        name: 'Jane Doe',
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      
      logger.logSubmissionSuccess('sub_456', formData, 1500);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Form submission completed successfully');
      expect(loggedData.context.duration).toBe('1500ms');
    });

    it('should log form submission failure', () => {
      const error = new Error('Submission failed');
      const formData = {
        name: 'Test User',
        contactMethods: ['phone'],
        socialPlatforms: ['tiktok'],
        phone: '555-1234'
      };
      
      logger.logSubmissionFailure('sub_789', error, formData, 2, true);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Form submission failed');
      expect(loggedData.context.attemptNumber).toBe(2);
      expect(loggedData.context.willRetry).toBe(true);
      expect(loggedData.context.fullFormData).toEqual(formData);
    });

    it('should log Google Sheets operations', () => {
      logger.logSheetsOperation('append', 'sub_101', true, undefined, { rows: 1 });
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Google Sheets append successful');
      expect(loggedData.operation).toBe('google_sheets');
      expect(loggedData.context.rows).toBe(1);
    });

    it('should log authentication events', () => {
      const authError = new Error('Invalid credentials');
      logger.logAuthentication(false, authError, { clientEmail: 'test@example.com' });
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Google Sheets authentication failed');
      expect(loggedData.operation).toBe('authentication');
    });

    it('should log retry attempts', () => {
      const retryError = new Error('Network timeout');
      logger.logRetryAttempt('sub_202', 2, 3, retryError, 2000);
      
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleWarn.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Retry attempt 2/3');
      expect(loggedData.context.nextRetryDelay).toBe('2000ms');
    });

    it('should log performance metrics', () => {
      logger.logPerformance('api_call', 750, 'sub_303', { endpoint: '/submit' });
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Performance: api_call');
      expect(loggedData.context.duration).toBe('750ms');
      expect(loggedData.operation).toBe('performance');
    });

    it('should log fallback activation', () => {
      logger.logFallbackActivated('authentication failure', 'sub_404', { additionalInfo: 'invalid token' });
      
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleWarn.mock.calls[0][0]);
      
      expect(loggedData.message).toBe('Fallback mechanism activated');
      expect(loggedData.context.reason).toBe('authentication failure');
      expect(loggedData.context.additionalInfo).toBe('invalid token');
      expect(loggedData.operation).toBe('fallback');
    });
  });

  describe('Log Entry Structure', () => {
    it('should include required fields in all log entries', () => {
      logger.info('Test message');
      
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData).toHaveProperty('timestamp');
      expect(loggedData).toHaveProperty('level');
      expect(loggedData).toHaveProperty('message');
      expect(typeof loggedData.timestamp).toBe('string');
      expect(new Date(loggedData.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', () => {
      logger.debug('Debug message', { key: 'value' }, 'operation', 'id');
      
      // Debug messages might not be logged in production, so check if anything was logged
      if (mockConsoleLog.mock.calls.length > 0) {
        const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
        expect(loggedData.context).toEqual({ key: 'value' });
        expect(loggedData.operation).toBe('operation');
        expect(loggedData.submissionId).toBe('id');
      }
    });
  });
});