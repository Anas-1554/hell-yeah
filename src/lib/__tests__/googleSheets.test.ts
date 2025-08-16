import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { google } from 'googleapis';
import { GoogleSheetsServiceImpl, createGoogleSheetsService, createGoogleSheetsServiceFromEnv } from '../googleSheets';
import type { FormSubmissionPayload, GoogleSheetsConfig } from '../../types/googleSheets';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: vi.fn()
    },
    sheets: vi.fn()
  }
}));

// Mock dataFormatter
vi.mock('../dataFormatter', () => ({
  convertToSpreadsheetRow: vi.fn((data) => ({
    timestamp: '01/15/2024, 14:30:25',
    name: data.name,
    contactMethods: data.contactMethods.join(', '),
    email: data.email || '',
    phone: data.phone || '',
    socialPlatforms: data.socialPlatforms.join(', '),
    socialMediaHandle: data.socialMediaHandle
  }))
}));

describe('GoogleSheetsService', () => {
  let mockSheetsApi: any;
  let mockJWT: any;
  let config: GoogleSheetsConfig;
  let service: GoogleSheetsServiceImpl;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock JWT constructor
    mockJWT = {
      authorize: vi.fn()
    };
    (google.auth.JWT as any).mockImplementation(() => mockJWT);

    // Mock Sheets API
    mockSheetsApi = {
      spreadsheets: {
        get: vi.fn(),
        values: {
          append: vi.fn()
        }
      }
    };
    (google.sheets as any).mockReturnValue(mockSheetsApi);

    // Test configuration
    config = {
      privateKey: 'test-private-key\\nwith-newlines',
      clientEmail: 'test@example.com',
      spreadsheetId: 'test-spreadsheet-id',
      sheetName: 'TestSheet'
    };

    service = new GoogleSheetsServiceImpl(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should initialize Google Sheets client with correct parameters', () => {
      expect(google.auth.JWT).toHaveBeenCalledWith(
        'test@example.com',
        undefined,
        'test-private-key\nwith-newlines', // Should handle escaped newlines
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      expect(google.sheets).toHaveBeenCalledWith({ version: 'v4', auth: mockJWT });
    });

    it('should throw error if client initialization fails', () => {
      (google.auth.JWT as any).mockImplementation(() => {
        throw new Error('Auth failed');
      });

      expect(() => new GoogleSheetsServiceImpl(config)).toThrow(
        'Failed to initialize Google Sheets client: Auth failed'
      );
    });
  });

  describe('validateConnection', () => {
    it('should return true when connection is valid', async () => {
      mockSheetsApi.spreadsheets.get.mockResolvedValue({
        status: 200,
        data: { properties: { title: 'Test Sheet' } }
      });

      const result = await service.validateConnection();

      expect(result).toBe(true);
      expect(mockSheetsApi.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        fields: 'properties.title'
      });
    });

    it('should return false when API call fails', async () => {
      mockSheetsApi.spreadsheets.get.mockRejectedValue(new Error('API Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.validateConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Google Sheets connection validation failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return false when response status is not 200', async () => {
      mockSheetsApi.spreadsheets.get.mockResolvedValue({
        status: 404,
        data: null
      });

      const result = await service.validateConnection();

      expect(result).toBe(false);
    });

    it('should return false when response data is empty', async () => {
      mockSheetsApi.spreadsheets.get.mockResolvedValue({
        status: 200,
        data: null
      });

      const result = await service.validateConnection();

      expect(result).toBe(false);
    });
  });

  describe('appendFormData', () => {
    const testFormData: FormSubmissionPayload = {
      timestamp: '2024-01-15T14:30:25.000Z',
      name: 'John Doe',
      contactMethods: ['Email', 'Phone'],
      email: 'john@example.com',
      phone: '(555) 123-4567',
      socialPlatforms: ['Instagram', 'TikTok'],
      socialMediaHandle: '@johndoe'
    };

    it('should successfully append form data to spreadsheet', async () => {
      mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
        status: 200,
        data: { updates: { updatedRows: 1 } }
      });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.appendFormData(testFormData);

      expect(mockSheetsApi.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'TestSheet!A:G',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [[
            '01/15/2024, 14:30:25',
            'John Doe',
            'Email, Phone',
            'john@example.com',
            '(555) 123-4567',
            'Instagram, TikTok',
            '@johndoe'
          ]]
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Successfully appended form data to Google Sheets (attempt 1)'
      );

      consoleSpy.mockRestore();
    });

    it('should retry on failure and succeed on second attempt', async () => {
      mockSheetsApi.spreadsheets.values.append
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 200, data: {} });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.appendFormData(testFormData);

      expect(mockSheetsApi.spreadsheets.values.append).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('Attempt 1 failed:', 'Network error');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Successfully appended form data to Google Sheets (attempt 2)'
      );

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should throw error after max retries', async () => {
      mockSheetsApi.spreadsheets.values.append.mockRejectedValue(new Error('Persistent error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.appendFormData(testFormData)).rejects.toThrow(
        'Failed to append data to Google Sheets after 3 attempts. Last error: Persistent error'
      );

      expect(mockSheetsApi.spreadsheets.values.append).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });

    it('should handle unexpected response status', async () => {
      mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
        status: 500,
        data: {}
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.appendFormData(testFormData)).rejects.toThrow(
        'Failed to append data to Google Sheets after 3 attempts. Last error: Unexpected response status: 500'
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      mockSheetsApi.spreadsheets.values.append.mockRejectedValue('String error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.appendFormData(testFormData)).rejects.toThrow(
        'Failed to append data to Google Sheets after 3 attempts. Last error: Unknown error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('factory functions', () => {
    it('should create service instance with createGoogleSheetsService', () => {
      const service = createGoogleSheetsService(config);
      expect(service).toBeInstanceOf(GoogleSheetsServiceImpl);
    });

    describe('createGoogleSheetsServiceFromEnv', () => {
      const originalEnv = process.env;

      beforeEach(() => {
        process.env = { ...originalEnv };
      });

      afterEach(() => {
        process.env = originalEnv;
      });

      it('should create service from environment variables', () => {
        process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'env-private-key';
        process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'env@example.com';
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'env-spreadsheet-id';
        process.env.GOOGLE_SHEETS_SHEET_NAME = 'EnvSheet';

        const service = createGoogleSheetsServiceFromEnv();
        expect(service).toBeInstanceOf(GoogleSheetsServiceImpl);
      });

      it('should use default sheet name when not provided', () => {
        process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'env-private-key';
        process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'env@example.com';
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'env-spreadsheet-id';
        delete process.env.GOOGLE_SHEETS_SHEET_NAME;

        const service = createGoogleSheetsServiceFromEnv();
        expect(service).toBeInstanceOf(GoogleSheetsServiceImpl);
      });

      it('should throw error when required environment variables are missing', () => {
        delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
        delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
        delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

        expect(() => createGoogleSheetsServiceFromEnv()).toThrow(
          'Missing required environment variables: GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_CLIENT_EMAIL, and GOOGLE_SHEETS_SPREADSHEET_ID must be set'
        );
      });

      it('should throw error when private key is missing', () => {
        delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
        process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'env@example.com';
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'env-spreadsheet-id';

        expect(() => createGoogleSheetsServiceFromEnv()).toThrow(
          'Missing required environment variables'
        );
      });

      it('should throw error when client email is missing', () => {
        process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'env-private-key';
        delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'env-spreadsheet-id';

        expect(() => createGoogleSheetsServiceFromEnv()).toThrow(
          'Missing required environment variables'
        );
      });

      it('should throw error when spreadsheet ID is missing', () => {
        process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'env-private-key';
        process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'env@example.com';
        delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

        expect(() => createGoogleSheetsServiceFromEnv()).toThrow(
          'Missing required environment variables'
        );
      });
    });
  });
});