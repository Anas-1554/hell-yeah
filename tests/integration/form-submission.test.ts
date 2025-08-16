import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/submit-form';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { FormSubmissionPayload, SubmitFormResponse } from '../../src/types/googleSheets';

// Mock the Google Sheets service
vi.mock('../../src/lib/googleSheets', () => ({
  createGoogleSheetsServiceFromEnv: vi.fn(() => ({
    appendFormData: vi.fn(),
    validateConnection: vi.fn(() => Promise.resolve(true))
  }))
}));

// Mock the logger
vi.mock('../../src/lib/logger', () => ({
  logger: {
    generateSubmissionId: vi.fn(() => 'test-submission-id'),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    critical: vi.fn(),
    logAuthentication: vi.fn(),
    logConnectionValidation: vi.fn(),
    logSubmissionStart: vi.fn(),
    logSubmissionSuccess: vi.fn(),
    logSubmissionFailure: vi.fn(),
    logSheetsOperation: vi.fn()
  }
}));

// Mock the error handler
vi.mock('../../src/lib/errorHandler', () => ({
  errorHandler: {
    createErrorContext: vi.fn(() => ({})),
    handleError: vi.fn(() => Promise.resolve({ shouldRetry: false })),
    logForManualRecovery: vi.fn(),
    logSuccess: vi.fn()
  }
}));

describe('Form Submission Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test-private-key';
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test@example.com';
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-spreadsheet-id';
    process.env.GOOGLE_SHEETS_SHEET_NAME = 'Sheet1';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SHEETS_SHEET_NAME;
  });

  describe('Complete Form Submission Flow', () => {
    it('should successfully process a complete form submission', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'John Doe',
          contactMethods: ['email', 'phone'],
          email: 'john@example.com',
          phone: '(555) 123-4567',
          socialPlatforms: ['instagram', 'tiktok'],
          socialMediaHandle: '@johndoe'
        } as FormSubmissionPayload
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Form submitted successfully');
    });

    it('should successfully process a minimal form submission', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Jane Smith',
          contactMethods: ['email'],
          email: 'jane@example.com',
          socialPlatforms: ['youtube'],
          socialMediaHandle: '@janesmith'
        } as FormSubmissionPayload
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Form submitted successfully');
    });

    it('should handle form submission with phone contact only', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Mike Johnson',
          contactMethods: ['phone'],
          phone: '555-987-6543',
          socialPlatforms: ['linkedin', 'facebook'],
          socialMediaHandle: '@mikejohnson'
        } as FormSubmissionPayload
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });

    it('should handle form submission with multiple social platforms', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Sarah Wilson',
          contactMethods: ['email', 'phone'],
          email: 'sarah@company.com',
          phone: '+1-555-111-2222',
          socialPlatforms: ['instagram', 'tiktok', 'youtube', 'linkedin'],
          socialMediaHandle: '@sarahwilson'
        } as FormSubmissionPayload
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });
  });

  describe('Form Data Validation', () => {
    it('should reject submission with missing name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          contactMethods: ['email'],
          email: 'test@example.com',
          socialPlatforms: ['instagram'],
          socialMediaHandle: '@test'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid form data');
    });

    it('should reject submission with empty name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: '   ',
          contactMethods: ['email'],
          email: 'test@example.com',
          socialPlatforms: ['instagram'],
          socialMediaHandle: '@test'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should reject submission with invalid email format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Test User',
          contactMethods: ['email'],
          email: 'invalid-email',
          socialPlatforms: ['instagram'],
          socialMediaHandle: '@test'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should reject submission with empty contact methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Test User',
          contactMethods: [],
          socialPlatforms: ['instagram'],
          socialMediaHandle: '@test'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should reject submission with empty social platforms', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Test User',
          contactMethods: ['email'],
          email: 'test@example.com',
          socialPlatforms: [],
          socialMediaHandle: '@test'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should reject submission with missing social media handle', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: 'Test User',
          contactMethods: ['email'],
          email: 'test@example.com',
          socialPlatforms: ['instagram'],
          socialMediaHandle: ''
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Method not allowed');
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'PUT'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'DELETE'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize and truncate long input values', async () => {
      const longName = 'A'.repeat(200); // 200 characters
      const longEmail = 'test' + 'x'.repeat(100) + '@example.com'; // Very long email
      const longHandle = '@' + 'handle'.repeat(50); // Very long handle

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: longName,
          contactMethods: ['email'],
          email: longEmail,
          socialPlatforms: ['instagram'],
          socialMediaHandle: longHandle
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });

    it('should trim whitespace from input values', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: {
          name: '  John Doe  ',
          contactMethods: ['email'],
          email: '  john@example.com  ',
          socialPlatforms: ['instagram'],
          socialMediaHandle: '  @johndoe  '
        } as FormSubmissionPayload
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });
  });
});