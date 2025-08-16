import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import handler from '../submit-form';
import type { SubmitFormResponse, FormSubmissionPayload } from '../../../src/types/googleSheets';

// Mock the Google Sheets service
vi.mock('../../../src/lib/googleSheets', () => ({
  createGoogleSheetsServiceFromEnv: vi.fn(() => ({
    appendFormData: vi.fn(),
    validateConnection: vi.fn()
  }))
}));

// Mock console.log to capture structured logs
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('/api/submit-form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  const validFormData: FormSubmissionPayload = {
    timestamp: '2024-01-15T10:30:00.000Z',
    name: 'John Doe',
    contactMethods: ['email', 'phone'],
    email: 'john@example.com',
    phone: '(555) 123-4567',
    socialPlatforms: ['instagram', 'tiktok'],
    socialMediaHandle: '@johndoe'
  };

  describe('Request Method Validation', () => {
    it('should reject GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Method not allowed'
      });
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'PUT'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Method not allowed'
      });
    });

    it('should accept POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: validFormData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Data Validation', () => {
    it('should reject requests with missing name', async () => {
      const invalidData = { ...validFormData, name: '' };
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: invalidData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Invalid form data'
      });
    });

    it('should reject requests with missing social media handle', async () => {
      const invalidData = { ...validFormData, socialMediaHandle: '' };
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: invalidData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Invalid form data'
      });
    });

    it('should reject requests with empty contact methods array', async () => {
      const invalidData = { ...validFormData, contactMethods: [] };
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: invalidData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Invalid form data'
      });
    });

    it('should reject requests with empty social platforms array', async () => {
      const invalidData = { ...validFormData, socialPlatforms: [] };
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: invalidData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Invalid form data'
      });
    });

    it('should reject requests with invalid email format', async () => {
      const invalidData = { ...validFormData, email: 'invalid-email' };
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: invalidData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        message: 'Invalid form data'
      });
    });

    it('should accept valid form data without optional fields', async () => {
      const minimalData = {
        timestamp: '2024-01-15T10:30:00.000Z',
        name: 'John Doe',
        contactMethods: ['email'],
        socialPlatforms: ['instagram'],
        socialMediaHandle: '@johndoe'
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: minimalData
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'Form submitted successfully'
      });
    });
  });

  describe('Data Sanitization', () => {
    it('should trim and limit string lengths', async () => {
      const { createGoogleSheetsServiceFromEnv } = await import('../../../src/lib/googleSheets');
      const mockAppendFormData = vi.fn().mockResolvedValue(undefined);
      vi.mocked(createGoogleSheetsServiceFromEnv).mockReturnValue({
        appendFormData: mockAppendFormData,
        validateConnection: vi.fn()
      });

      const longData = {
        timestamp: '2024-01-15T10:30:00.000Z',
        name: '  ' + 'a'.repeat(150) + '  ', // Long name with spaces
        contactMethods: ['email', 'phone'],
        email: 'test@example.com', // Valid email without extra spaces for this test
        phone: '(555) 123-4567',
        socialPlatforms: ['instagram', 'tiktok'],
        socialMediaHandle: '  @' + 'b'.repeat(150) + '  '
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: longData
      });

      await handler(req, res);

      // Check that the function was called
      expect(mockAppendFormData).toHaveBeenCalled();
      
      // Get the actual call arguments to verify sanitization
      const callArgs = mockAppendFormData.mock.calls[0][0];
      
      // Verify sanitization
      expect(callArgs.name).toBe('a'.repeat(100)); // Trimmed and limited to 100 chars
      expect(callArgs.email).toBe('test@example.com'); // Should remain the same
      expect(callArgs.socialMediaHandle).toBe('@' + 'b'.repeat(99)); // Trimmed and limited to 100 chars total
    });


  });

  describe('Google Sheets Integration', () => {
    it('should successfully submit data to Google Sheets', async () => {
      const { createGoogleSheetsServiceFromEnv } = await import('../../../src/lib/googleSheets');
      const mockAppendFormData = vi.fn().mockResolvedValue(undefined);
      vi.mocked(createGoogleSheetsServiceFromEnv).mockReturnValue({
        appendFormData: mockAppendFormData,
        validateConnection: vi.fn()
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: validFormData
      });

      await handler(req, res);

      expect(mockAppendFormData).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validFormData.name,
          contactMethods: validFormData.contactMethods,
          email: validFormData.email,
          phone: validFormData.phone,
          socialPlatforms: validFormData.socialPlatforms,
          socialMediaHandle: validFormData.socialMediaHandle,
          timestamp: expect.any(String)
        })
      );

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'Form submitted successfully'
      });
    });

    it('should return success even when Google Sheets fails (graceful error handling)', async () => {
      const { createGoogleSheetsServiceFromEnv } = await import('../../../src/lib/googleSheets');
      const mockAppendFormData = vi.fn().mockRejectedValue(new Error('Google Sheets API error'));
      vi.mocked(createGoogleSheetsServiceFromEnv).mockReturnValue({
        appendFormData: mockAppendFormData,
        validateConnection: vi.fn()
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: validFormData
      });

      await handler(req, res);

      // Should still return success to maintain user experience
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'Form submitted successfully'
      });

      // Should log the error
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
    });
  });

  describe('Structured Logging', () => {
    it('should log successful form submissions', async () => {
      const { createGoogleSheetsServiceFromEnv } = await import('../../../src/lib/googleSheets');
      vi.mocked(createGoogleSheetsServiceFromEnv).mockReturnValue({
        appendFormData: vi.fn().mockResolvedValue(undefined),
        validateConnection: vi.fn()
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: validFormData
      });

      await handler(req, res);

      // Should log processing start
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Processing form submission"')
      );

      // Should log successful completion
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Form submission successfully processed"')
      );
    });

    it('should log errors with context', async () => {
      const { createGoogleSheetsServiceFromEnv } = await import('../../../src/lib/googleSheets');
      const error = new Error('Test error');
      vi.mocked(createGoogleSheetsServiceFromEnv).mockReturnValue({
        appendFormData: vi.fn().mockRejectedValue(error),
        validateConnection: vi.fn()
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: validFormData
      });

      await handler(req, res);

      // Should log error with context
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Form submission failed"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );
    });

    it('should log invalid request methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'GET'
      });

      await handler(req, res);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"warn"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Invalid request method"')
      );
    });

    it('should log invalid form data', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: { invalid: 'data' }
      });

      await handler(req, res);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"warn"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Invalid form data received"')
      );
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing environment variables gracefully', async () => {
      const { createGoogleSheetsServiceFromEnv } = await import('../../../src/lib/googleSheets');
      vi.mocked(createGoogleSheetsServiceFromEnv).mockImplementation(() => {
        throw new Error('Missing required environment variables');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<SubmitFormResponse>>({
        method: 'POST',
        body: validFormData
      });

      await handler(req, res);

      // Should still return success to user
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'Form submitted successfully'
      });

      // Should log the error
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
    });
  });
});