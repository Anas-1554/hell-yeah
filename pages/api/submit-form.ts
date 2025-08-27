import type { NextApiRequest, NextApiResponse } from 'next';
import { createGoogleSheetsServiceFromEnv } from '../../src/lib/googleSheets';
import type { FormSubmissionPayload, SubmitFormResponse } from '../../src/types/googleSheets';
import { logger } from '../../src/lib/logger';
import { errorHandler } from '../../src/lib/errorHandler';

/**
 * Validates the incoming form submission payload
 * @param data - The data to validate
 * @returns boolean - true if valid, false otherwise
 */
function validateFormData(data: any): data is FormSubmissionPayload {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return false;
  }

  if (!data.socialMediaHandle || typeof data.socialMediaHandle !== 'string' || data.socialMediaHandle.trim().length === 0) {
    return false;
  }

  if (!Array.isArray(data.contactMethods) || data.contactMethods.length === 0) {
    return false;
  }

  if (!Array.isArray(data.socialPlatforms) || data.socialPlatforms.length === 0) {
    return false;
  }

  // Optional fields validation (if present)
  if (data.email && (typeof data.email !== 'string' || !isValidEmail(data.email.trim()))) {
    return false;
  }

  if (data.phone && (typeof data.phone !== 'string' || data.phone.trim().length === 0)) {
    return false;
  }

  // Optional address validation (if present)
  if (data.address && (typeof data.address !== 'string' || data.address.trim().length === 0)) {
    return false;
  }

  return true;
}

/**
 * Basic email validation
 * @param email - Email string to validate
 * @returns boolean - true if valid email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes form data to prevent injection attacks
 * @param data - FormSubmissionPayload to sanitize
 * @returns Sanitized FormSubmissionPayload
 */
function sanitizeFormData(data: FormSubmissionPayload): FormSubmissionPayload {
  return {
    timestamp: new Date().toISOString(),
    name: data.name.trim().substring(0, 100), // Limit length
    contactMethods: data.contactMethods.map(method => method.trim().substring(0, 50)),
    email: data.email?.trim().substring(0, 100),
    phone: data.phone?.trim().substring(0, 20),
    socialPlatforms: data.socialPlatforms.map(platform => platform.trim().substring(0, 50)),
    socialMediaHandle: data.socialMediaHandle.trim().substring(0, 100),
    address: data.address?.trim().substring(0, 500) // Allow longer address
  };
}

// Removed structuredLog function - now using comprehensive logger

/**
 * Vercel serverless function to handle form submissions
 * Validates, sanitizes, and sends form data to Google Sheets
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitFormResponse>
) {
  const submissionId = logger.generateSubmissionId();
  const startTime = Date.now();

  // Log incoming request
  logger.info('API request received', {
    method: req.method,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin
  }, 'api_request', submissionId);

  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.warn('Invalid request method', {
      method: req.method,
      allowedMethods: ['POST']
    }, 'api_request', submissionId);
    
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Validate request body
    if (!validateFormData(req.body)) {
      logger.warn('Invalid form data received', {
        hasBody: !!req.body,
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : []
      }, 'validation', submissionId);
      
      return res.status(400).json({
        success: false,
        message: 'Invalid form data'
      });
    }

    // Sanitize the form data
    const sanitizedData = sanitizeFormData(req.body);
    
    logger.info('Processing form submission', { 
      name: sanitizedData.name,
      contactMethods: sanitizedData.contactMethods,
      socialPlatforms: sanitizedData.socialPlatforms,
      hasEmail: !!sanitizedData.email,
      hasPhone: !!sanitizedData.phone,
      hasAddress: !!sanitizedData.address
    }, 'form_processing', submissionId);

    // Initialize Google Sheets service with error handling
    let googleSheetsService;
    try {
      googleSheetsService = createGoogleSheetsServiceFromEnv();
    } catch (serviceError) {
      const err = serviceError instanceof Error ? serviceError : new Error('Unknown service error');
      const errorContext = errorHandler.createErrorContext(
        submissionId,
        'service_initialization',
        sanitizedData
      );
      
      await errorHandler.handleError(err, errorContext);
      
      // Return success to user (per requirements) but log the error
      const duration = Date.now() - startTime;
      logger.warn('Service initialization failed but returning success to user', {
        duration: `${duration}ms`,
        error: err.message
      }, 'api_response', submissionId);
      
      return res.status(200).json({
        success: true,
        message: 'Form submitted successfully'
      });
    }

    // Validate connection before attempting to submit
    const connectionValid = await googleSheetsService.validateConnection();
    if (!connectionValid) {
      logger.warn('Google Sheets connection validation failed', {
        submissionId,
        suggestion: 'Check service account permissions and spreadsheet access'
      }, 'connection_validation', submissionId);
      
      // Log for manual recovery but return success to user
      errorHandler.logForManualRecovery(
        submissionId,
        sanitizedData,
        new Error('Connection validation failed'),
        'connection_validation'
      );
    }

    // Attempt to append data to Google Sheets
    try {
      await googleSheetsService.appendFormData(sanitizedData);
      
      const duration = Date.now() - startTime;
      logger.info('Form submission successfully processed', {
        name: sanitizedData.name,
        timestamp: sanitizedData.timestamp,
        duration: `${duration}ms`
      }, 'form_processing', submissionId);

      errorHandler.logSuccess('form_submission', submissionId, duration, {
        name: sanitizedData.name
      });

    } catch (sheetsError) {
      const err = sheetsError instanceof Error ? sheetsError : new Error('Unknown sheets error');
      const errorContext = errorHandler.createErrorContext(
        submissionId,
        'google_sheets_append',
        sanitizedData
      );
      
      await errorHandler.handleError(err, errorContext);
      
      // Log for manual recovery
      errorHandler.logForManualRecovery(submissionId, sanitizedData, err, 'google_sheets_append');
    }

    // Always return success response to maintain user experience
    const duration = Date.now() - startTime;
    logger.info('API response sent', {
      success: true,
      duration: `${duration}ms`
    }, 'api_response', submissionId);

    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully'
    });

  } catch (error) {
    // Handle any unexpected errors
    const err = error instanceof Error ? error : new Error('Unknown error');
    const duration = Date.now() - startTime;
    
    const errorContext = errorHandler.createErrorContext(
      submissionId,
      'api_handler',
      req.body
    );
    
    await errorHandler.handleError(err, errorContext);

    logger.error('Unexpected API error', err, {
      duration: `${duration}ms`,
      requestBody: req.body
    }, 'api_handler', submissionId);

    // Return success to user to maintain experience (as per requirements)
    // The error is logged for debugging but user sees success
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully'
    });
  }
}