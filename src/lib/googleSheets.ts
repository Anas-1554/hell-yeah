import { google } from 'googleapis';
import type { FormSubmissionPayload, GoogleSheetsConfig, GoogleSheetsService } from '../types/googleSheets';
import { convertToSpreadsheetRow } from './dataFormatter';
import { logger } from './logger';
import { errorHandler } from './errorHandler';

/**
 * Google Sheets service for handling form data submissions
 * Provides authentication, data writing, and connection validation
 */
export class GoogleSheetsServiceImpl implements GoogleSheetsService {
  private sheets: any;
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize Google Sheets API client with service account authentication
   */
  private initializeClient(): void {
    const startTime = Date.now();
    
    try {
      logger.debug('Initializing Google Sheets client', {
        clientEmail: this.config.clientEmail,
        spreadsheetId: this.config.spreadsheetId,
        sheetName: this.config.sheetName
      }, 'client_initialization');

      // Create JWT client for service account authentication
      const auth = new google.auth.JWT({
        email: this.config.clientEmail,
        key: this.config.privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Initialize Sheets API client
      this.sheets = google.sheets({ version: 'v4', auth });

      const duration = Date.now() - startTime;
      logger.info('Google Sheets client initialized successfully', {
        duration: `${duration}ms`,
        clientEmail: this.config.clientEmail
      }, 'client_initialization');

      logger.logAuthentication(true, undefined, {
        clientEmail: this.config.clientEmail,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      logger.logAuthentication(false, err, {
        clientEmail: this.config.clientEmail,
        duration: `${duration}ms`
      });

      throw new Error(`Failed to initialize Google Sheets client: ${err.message}`);
    }
  }

  /**
   * Validates connection to Google Sheets API and spreadsheet access
   * @returns Promise<boolean> - true if connection is valid
   */
  async validateConnection(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      logger.debug('Validating Google Sheets connection', {
        spreadsheetId: this.config.spreadsheetId,
        sheetName: this.config.sheetName
      }, 'connection_validation');

      // Try to get spreadsheet metadata to validate access
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
        fields: 'properties.title'
      });

      const duration = Date.now() - startTime;
      const isValid = response.status === 200 && !!response.data;

      if (isValid) {
        logger.logConnectionValidation(true, undefined, {
          spreadsheetId: this.config.spreadsheetId,
          spreadsheetTitle: response.data.properties?.title,
          duration: `${duration}ms`
        });
      } else {
        logger.logConnectionValidation(false, undefined, {
          spreadsheetId: this.config.spreadsheetId,
          responseStatus: response.status,
          duration: `${duration}ms`
        });
      }

      return isValid;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      logger.logConnectionValidation(false, err, {
        spreadsheetId: this.config.spreadsheetId,
        duration: `${duration}ms`
      });

      return false;
    }
  }

  /**
   * Appends form data to the designated Google Sheets spreadsheet
   * @param data FormSubmissionPayload to append to spreadsheet
   */
  async appendFormData(data: FormSubmissionPayload): Promise<void> {
    const submissionId = logger.generateSubmissionId();
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;

    logger.logSubmissionStart(submissionId, data);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        logger.debug(`Starting append attempt ${attempt}/${maxRetries}`, {
          submissionId,
          attempt,
          maxRetries,
          name: data.name
        }, 'append_data', submissionId);

        // Convert form data to spreadsheet row format
        const rowData = convertToSpreadsheetRow(data);
        
        // Convert to array format for Google Sheets API
        const values = [
          [
            rowData.timestamp,
            rowData.name,
            rowData.contactMethods,
            rowData.email,
            rowData.phone,
            rowData.socialPlatforms,
            rowData.socialMediaHandle,
            rowData.address
          ]
        ];

        // Append data to spreadsheet
        const response = await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.sheetName}!A:H`, // Columns A through H (added address column)
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values
          }
        });

        const attemptDuration = Date.now() - attemptStartTime;
        const totalDuration = Date.now() - startTime;

        if (response.status === 200) {
          logger.logSheetsOperation('append', submissionId, true, undefined, {
            attempt,
            attemptDuration: `${attemptDuration}ms`,
            totalDuration: `${totalDuration}ms`,
            updatedRange: response.data.updates?.updatedRange,
            updatedRows: response.data.updates?.updatedRows
          });

          logger.logSubmissionSuccess(submissionId, data, totalDuration);
          errorHandler.logSuccess('append_form_data', submissionId, totalDuration, {
            attempt,
            updatedRange: response.data.updates?.updatedRange
          });

          return;
        } else {
          throw new Error(`Unexpected response status: ${response.status}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const attemptDuration = Date.now() - attemptStartTime;
        
        const errorContext = errorHandler.createErrorContext(
          submissionId,
          'append_form_data',
          data,
          attempt
        );

        const errorResult = await errorHandler.handleError(lastError, errorContext);

        logger.logSheetsOperation('append', submissionId, false, lastError, {
          attempt,
          attemptDuration: `${attemptDuration}ms`,
          willRetry: errorResult.shouldRetry
        });

        // If this is the last attempt or error is not retryable, break
        if (attempt === maxRetries || !errorResult.shouldRetry) {
          break;
        }

        // Wait before retrying with calculated delay
        if (errorResult.retryDelay) {
          logger.debug(`Waiting ${errorResult.retryDelay}ms before retry`, {
            submissionId,
            attempt,
            retryDelay: errorResult.retryDelay
          }, 'retry_delay', submissionId);
          
          await new Promise(resolve => setTimeout(resolve, errorResult.retryDelay));
        }
      }
    }

    // If we get here, all retries failed
    
    // Log for manual recovery
    if (lastError) {
      errorHandler.logForManualRecovery(submissionId, data, lastError, 'append_form_data');
    }

    logger.logSubmissionFailure(submissionId, lastError || new Error('Unknown error'), data, maxRetries, false);
    
    throw new Error(`Failed to append data to Google Sheets after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }
}

/**
 * Factory function to create GoogleSheetsService instance
 * @param config GoogleSheetsConfig object
 * @returns GoogleSheetsService instance
 */
export const createGoogleSheetsService = (config: GoogleSheetsConfig): GoogleSheetsService => {
  return new GoogleSheetsServiceImpl(config);
};

/**
 * Creates GoogleSheetsService from environment variables
 * @returns GoogleSheetsService instance configured from environment
 * @throws Error if required environment variables are missing
 */
export const createGoogleSheetsServiceFromEnv = (): GoogleSheetsService => {
  try {
    logger.debug('Creating Google Sheets service from environment variables', {
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1'
    }, 'service_creation');

    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1';

    if (!privateKey || !clientEmail || !spreadsheetId) {
      const missingVars = [];
      if (!privateKey) missingVars.push('GOOGLE_SHEETS_PRIVATE_KEY');
      if (!clientEmail) missingVars.push('GOOGLE_SHEETS_CLIENT_EMAIL');
      if (!spreadsheetId) missingVars.push('GOOGLE_SHEETS_SPREADSHEET_ID');

      const error = new Error(
        `Missing required environment variables: ${missingVars.join(', ')} must be set`
      );

      logger.critical('Missing required environment variables for Google Sheets service', error, {
        missingVariables: missingVars,
        suggestion: 'Check Vercel environment variable configuration'
      }, 'service_creation');

      throw error;
    }

    const service = createGoogleSheetsService({
      privateKey,
      clientEmail,
      spreadsheetId,
      sheetName
    });

    logger.info('Google Sheets service created successfully', {
      clientEmail,
      spreadsheetId,
      sheetName
    }, 'service_creation');

    return service;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to create Google Sheets service from environment', err, {
      suggestion: 'Verify environment variables are properly configured'
    }, 'service_creation');
    throw err;
  }
};