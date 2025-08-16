/**
 * Comprehensive error handling utility for Google Sheets integration
 * Provides error classification, recovery strategies, and fallback mechanisms
 */

import { logger } from './logger';
import type { FormSubmissionPayload } from '../types/googleSheets';

export type ErrorCategory = 
  | 'authentication'
  | 'network'
  | 'rate_limit'
  | 'validation'
  | 'permission'
  | 'quota'
  | 'server'
  | 'unknown';

export interface ErrorContext {
  submissionId: string;
  operation: string;
  attemptNumber?: number;
  formData?: FormSubmissionPayload;
  timestamp: string;
}

export interface ErrorHandlingResult {
  shouldRetry: boolean;
  retryDelay?: number;
  fallbackActivated: boolean;
  userMessage: string;
  loggedForRecovery: boolean;
}

/**
 * Error handler class for comprehensive error management
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private maxRetries: number = 3;
  private baseRetryDelay: number = 1000; // 1 second

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Classify error based on error message and properties
   */
  public classifyError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Authentication errors
    if (message.includes('unauthorized') || 
        message.includes('invalid_grant') ||
        message.includes('authentication') ||
        message.includes('invalid credentials') ||
        name.includes('auth')) {
      return 'authentication';
    }

    // Network errors
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('enotfound') ||
        message.includes('econnreset') ||
        name.includes('network')) {
      return 'network';
    }

    // Rate limiting
    if (message.includes('rate limit') ||
        message.includes('quota exceeded') ||
        message.includes('too many requests') ||
        message.includes('429')) {
      return 'rate_limit';
    }

    // Validation errors
    if (message.includes('validation') ||
        message.includes('invalid data') ||
        message.includes('bad request') ||
        message.includes('400')) {
      return 'validation';
    }

    // Permission errors
    if (message.includes('permission') ||
        message.includes('forbidden') ||
        message.includes('access denied') ||
        message.includes('403')) {
      return 'permission';
    }

    // Quota errors
    if (message.includes('quota') ||
        message.includes('limit exceeded') ||
        message.includes('usage limit')) {
      return 'quota';
    }

    // Server errors
    if (message.includes('internal server error') ||
        message.includes('service unavailable') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')) {
      return 'server';
    }

    return 'unknown';
  }

  /**
   * Determine if error is retryable based on category
   */
  public isRetryable(category: ErrorCategory): boolean {
    switch (category) {
      case 'network':
      case 'rate_limit':
      case 'server':
      case 'quota':
        return true;
      case 'authentication':
      case 'validation':
      case 'permission':
      case 'unknown':
        return false;
      default:
        return false;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  public calculateRetryDelay(attemptNumber: number, category: ErrorCategory): number {
    let baseDelay = this.baseRetryDelay;

    // Longer delays for rate limiting
    if (category === 'rate_limit') {
      baseDelay = 5000; // 5 seconds base for rate limits
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return baseDelay * Math.pow(2, attemptNumber - 1);
  }

  /**
   * Handle error with comprehensive logging and recovery strategy
   */
  public async handleError(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    const category = this.classifyError(error);
    const isRetryable = this.isRetryable(category);
    const shouldRetry = isRetryable && (context.attemptNumber || 1) < this.maxRetries;
    const retryDelay = shouldRetry ? this.calculateRetryDelay(context.attemptNumber || 1, category) : undefined;

    // Log the error with full context
    logger.logSubmissionFailure(
      context.submissionId,
      error,
      context.formData || {},
      context.attemptNumber,
      shouldRetry
    );

    // Log specific error category information
    logger.error(`${category} error in ${context.operation}`, error, {
      category,
      isRetryable,
      shouldRetry,
      retryDelay,
      attemptNumber: context.attemptNumber || 1,
      maxRetries: this.maxRetries
    }, context.operation, context.submissionId);

    // Activate fallback mechanisms
    const fallbackActivated = await this.activateFallback(error, category, context);

    // Log retry attempt if applicable
    if (shouldRetry && retryDelay) {
      logger.logRetryAttempt(
        context.submissionId,
        context.attemptNumber || 1,
        this.maxRetries,
        error,
        retryDelay
      );
    }

    return {
      shouldRetry,
      retryDelay,
      fallbackActivated,
      userMessage: this.getUserMessage(category),
      loggedForRecovery: true
    };
  }

  /**
   * Activate fallback mechanisms based on error category
   */
  private async activateFallback(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<boolean> {
    let fallbackActivated = false;

    switch (category) {
      case 'authentication':
        // Log detailed authentication failure for manual intervention
        logger.logAuthentication(false, error, {
          submissionId: context.submissionId,
          operation: context.operation,
          suggestion: 'Check service account credentials and permissions'
        });
        fallbackActivated = true;
        break;

      case 'permission':
        // Log permission issue with recovery instructions
        logger.error('Permission denied - manual intervention required', error, {
          submissionId: context.submissionId,
          operation: context.operation,
          suggestion: 'Verify service account has edit access to the spreadsheet',
          recoveryAction: 'Share spreadsheet with service account email'
        }, context.operation, context.submissionId);
        fallbackActivated = true;
        break;

      case 'quota':
        // Log quota exceeded with timing information
        logger.warn('API quota exceeded - data logged for later retry', {
          submissionId: context.submissionId,
          operation: context.operation,
          suggestion: 'Retry during off-peak hours or increase quota',
          formData: context.formData
        }, context.operation, context.submissionId);
        fallbackActivated = true;
        break;

      case 'rate_limit':
        // Log rate limiting with backoff strategy
        logger.warn('Rate limit exceeded - implementing backoff strategy', {
          submissionId: context.submissionId,
          operation: context.operation,
          suggestion: 'Automatic retry with exponential backoff'
        }, context.operation, context.submissionId);
        break;

      case 'network':
        // Log network issues with connectivity suggestions
        logger.warn('Network connectivity issue detected', {
          submissionId: context.submissionId,
          operation: context.operation,
          suggestion: 'Check internet connectivity and Google Sheets API status'
        }, context.operation, context.submissionId);
        break;

      case 'validation':
        // Log validation errors with data context
        logger.error('Data validation failed - check form data format', error, {
          submissionId: context.submissionId,
          operation: context.operation,
          formData: context.formData,
          suggestion: 'Review data formatting and validation rules'
        }, context.operation, context.submissionId);
        fallbackActivated = true;
        break;

      default:
        // Log unknown errors with full context for investigation
        logger.error('Unknown error encountered', error, {
          submissionId: context.submissionId,
          operation: context.operation,
          formData: context.formData,
          suggestion: 'Manual investigation required'
        }, context.operation, context.submissionId);
        fallbackActivated = true;
        break;
    }

    if (fallbackActivated) {
      logger.logFallbackActivated(`${category} error`, context.submissionId, {
        operation: context.operation,
        errorMessage: error.message
      });
    }

    return fallbackActivated;
  }

  /**
   * Get user-friendly message based on error category
   * Note: Per requirements, we always show success to maintain user experience
   */
  private getUserMessage(_category: ErrorCategory): string {
    // Always return success message to maintain user experience
    // The actual error is logged for debugging purposes
    return 'Form submitted successfully';
  }

  /**
   * Create error context for tracking
   */
  public createErrorContext(
    submissionId: string,
    operation: string,
    formData?: FormSubmissionPayload,
    attemptNumber?: number
  ): ErrorContext {
    return {
      submissionId,
      operation,
      formData,
      attemptNumber,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log successful operation for monitoring
   */
  public logSuccess(
    operation: string,
    submissionId: string,
    duration?: number,
    context?: any
  ): void {
    logger.info(`${operation} completed successfully`, {
      duration: duration ? `${duration}ms` : undefined,
      ...context
    }, operation, submissionId);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(
    operation: string,
    startTime: number,
    submissionId: string,
    context?: any
  ): void {
    const duration = Date.now() - startTime;
    logger.logPerformance(operation, duration, submissionId, context);
  }

  /**
   * Create manual recovery log entry
   */
  public logForManualRecovery(
    submissionId: string,
    formData: FormSubmissionPayload,
    error: Error,
    operation: string
  ): void {
    logger.critical('Manual data recovery required', error, {
      submissionId,
      operation,
      recoveryData: {
        timestamp: formData.timestamp,
        name: formData.name,
        contactMethods: formData.contactMethods,
        email: formData.email,
        phone: formData.phone,
        socialPlatforms: formData.socialPlatforms,
        socialMediaHandle: formData.socialMediaHandle
      },
      instructions: 'Use recoveryData to manually add this submission to the spreadsheet'
    }, 'manual_recovery', submissionId);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();