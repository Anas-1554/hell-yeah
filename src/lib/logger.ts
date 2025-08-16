/**
 * Comprehensive logging utility for Google Sheets integration
 * Provides structured logging with different levels and contexts
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  operation?: string;
  submissionId?: string;
  userId?: string;
}

/**
 * Logger class for structured logging throughout the application
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Generate a unique submission ID for tracking
   */
  public generateSubmissionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    operation?: string,
    submissionId?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    if (operation) {
      entry.operation = operation;
    }

    if (submissionId) {
      entry.submissionId = submissionId;
    }

    return entry;
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logString = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
      case 'critical':
        console.error(logString);
        break;
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: LogContext, operation?: string, submissionId?: string): void {
    const entry = this.createLogEntry('debug', message, context, undefined, operation, submissionId);
    this.output(entry);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: LogContext, operation?: string, submissionId?: string): void {
    const entry = this.createLogEntry('info', message, context, undefined, operation, submissionId);
    this.output(entry);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: LogContext, operation?: string, submissionId?: string): void {
    const entry = this.createLogEntry('warn', message, context, undefined, operation, submissionId);
    this.output(entry);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, context?: LogContext, operation?: string, submissionId?: string): void {
    const entry = this.createLogEntry('error', message, context, error, operation, submissionId);
    this.output(entry);
  }

  /**
   * Log critical error message
   */
  public critical(message: string, error?: Error, context?: LogContext, operation?: string, submissionId?: string): void {
    const entry = this.createLogEntry('critical', message, context, error, operation, submissionId);
    this.output(entry);
  }

  /**
   * Log form submission start
   */
  public logSubmissionStart(submissionId: string, formData: any): void {
    this.info('Form submission started', {
      name: formData.name,
      contactMethods: formData.contactMethods,
      socialPlatforms: formData.socialPlatforms,
      hasEmail: !!formData.email,
      hasPhone: !!formData.phone
    }, 'form_submission', submissionId);
  }

  /**
   * Log form submission success
   */
  public logSubmissionSuccess(submissionId: string, formData: any, duration?: number): void {
    this.info('Form submission completed successfully', {
      name: formData.name,
      timestamp: formData.timestamp,
      duration: duration ? `${duration}ms` : undefined
    }, 'form_submission', submissionId);
  }

  /**
   * Log form submission failure with recovery context
   */
  public logSubmissionFailure(
    submissionId: string,
    error: Error,
    formData: any,
    attemptNumber?: number,
    willRetry?: boolean
  ): void {
    this.error('Form submission failed', error, {
      name: formData.name,
      contactMethods: formData.contactMethods,
      socialPlatforms: formData.socialPlatforms,
      email: formData.email,
      phone: formData.phone,
      socialMediaHandle: formData.socialMediaHandle,
      timestamp: formData.timestamp,
      attemptNumber,
      willRetry,
      // Include enough data for manual recovery
      fullFormData: formData
    }, 'form_submission', submissionId);
  }

  /**
   * Log Google Sheets API operation
   */
  public logSheetsOperation(
    operation: string,
    submissionId: string,
    success: boolean,
    error?: Error,
    context?: LogContext
  ): void {
    if (success) {
      this.info(`Google Sheets ${operation} successful`, context, 'google_sheets', submissionId);
    } else {
      this.error(`Google Sheets ${operation} failed`, error, context, 'google_sheets', submissionId);
    }
  }

  /**
   * Log authentication events
   */
  public logAuthentication(success: boolean, error?: Error, context?: LogContext): void {
    if (success) {
      this.info('Google Sheets authentication successful', context, 'authentication');
    } else {
      this.error('Google Sheets authentication failed', error, context, 'authentication');
    }
  }

  /**
   * Log connection validation
   */
  public logConnectionValidation(success: boolean, error?: Error, context?: LogContext): void {
    if (success) {
      this.info('Google Sheets connection validation successful', context, 'connection_validation');
    } else {
      this.warn('Google Sheets connection validation failed', context, 'connection_validation');
      if (error) {
        this.error('Connection validation error details', error, context, 'connection_validation');
      }
    }
  }

  /**
   * Log retry attempts
   */
  public logRetryAttempt(
    submissionId: string,
    attemptNumber: number,
    maxAttempts: number,
    error: Error,
    nextRetryDelay?: number
  ): void {
    this.warn(`Retry attempt ${attemptNumber}/${maxAttempts}`, {
      attemptNumber,
      maxAttempts,
      nextRetryDelay: nextRetryDelay ? `${nextRetryDelay}ms` : undefined,
      errorMessage: error.message
    }, 'retry', submissionId);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, duration: number, submissionId?: string, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...context
    }, 'performance', submissionId);
  }

  /**
   * Log fallback mechanism activation
   */
  public logFallbackActivated(reason: string, submissionId: string, context?: LogContext): void {
    this.warn('Fallback mechanism activated', {
      reason,
      ...context
    }, 'fallback', submissionId);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();