/**
 * Integration tests for error scenarios and recovery mechanisms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleSheetsServiceImpl } from '../googleSheets';
import type { FormSubmissionPayload, GoogleSheetsConfig } from '../../types/googleSheets';

// Mock the googleapis library
vi.mock('googleapis', () => ({
    google: {
        auth: {
            JWT: vi.fn().mockImplementation(() => ({}))
        },
        sheets: vi.fn().mockImplementation(() => ({
            spreadsheets: {
                get: vi.fn(),
                values: {
                    append: vi.fn()
                }
            }
        }))
    }
}));

// Mock the logger
vi.mock('../logger', () => ({
    logger: {
        generateSubmissionId: vi.fn(() => 'test_sub_123'),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        critical: vi.fn(),
        logSubmissionStart: vi.fn(),
        logSubmissionSuccess: vi.fn(),
        logSubmissionFailure: vi.fn(),
        logSheetsOperation: vi.fn(),
        logAuthentication: vi.fn(),
        logConnectionValidation: vi.fn(),
        logRetryAttempt: vi.fn(),
        logPerformance: vi.fn(),
        logFallbackActivated: vi.fn()
    }
}));

// Mock the error handler
vi.mock('../errorHandler', () => ({
    errorHandler: {
        createErrorContext: vi.fn((submissionId, operation, formData, attemptNumber) => ({
            submissionId,
            operation,
            formData,
            attemptNumber,
            timestamp: '2024-01-01T00:00:00.000Z'
        })),
        handleError: vi.fn(),
        logSuccess: vi.fn(),
        logPerformance: vi.fn(),
        logForManualRecovery: vi.fn()
    }
}));

const { logger } = await import('../logger');
const { errorHandler } = await import('../errorHandler');
const mockLogger = logger as any;
const mockErrorHandler = errorHandler as any;

describe('Error Scenarios Integration Tests', () => {
    let service: GoogleSheetsServiceImpl;
    let mockSheetsApi: any;

    const testConfig: GoogleSheetsConfig = {
        privateKey: 'test-private-key',
        clientEmail: 'test@example.com',
        spreadsheetId: 'test-spreadsheet-id',
        sheetName: 'Test Sheet'
    };

    const testFormData: FormSubmissionPayload = {
        timestamp: '2024-01-01T00:00:00.000Z',
        name: 'Test User',
        contactMethods: ['email'],
        email: 'test@example.com',
        socialPlatforms: ['instagram'],
        socialMediaHandle: '@testuser'
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        // Reset the mock implementation
        const { google } = await import('googleapis');
        mockSheetsApi = {
            spreadsheets: {
                get: vi.fn(),
                values: {
                    append: vi.fn()
                }
            }
        };
        (google.sheets as any).mockReturnValue(mockSheetsApi);

        service = new GoogleSheetsServiceImpl(testConfig);
    });

    describe('Authentication Error Scenarios', () => {
        it('should handle authentication failures during initialization', async () => {
            const { google } = await import('googleapis');
            (google.auth.JWT as any).mockImplementation(() => {
                throw new Error('invalid_grant: Invalid JWT');
            });

            expect(() => {
                new GoogleSheetsServiceImpl(testConfig);
            }).toThrow('Failed to initialize Google Sheets client: invalid_grant: Invalid JWT');

            expect(mockLogger.logAuthentication).toHaveBeenCalledWith(
                false,
                expect.any(Error),
                expect.objectContaining({
                    clientEmail: testConfig.clientEmail
                })
            );
        });

        it('should handle authentication failures during connection validation', async () => {
            mockSheetsApi.spreadsheets.get.mockRejectedValue(new Error('unauthorized'));

            const result = await service.validateConnection();

            expect(result).toBe(false);
            expect(mockLogger.logConnectionValidation).toHaveBeenCalledWith(
                false,
                expect.any(Error),
                expect.objectContaining({
                    spreadsheetId: testConfig.spreadsheetId
                })
            );
        });
    });

    describe('Network Error Scenarios', () => {
        it('should handle network timeouts with retry logic', async () => {
            const networkError = new Error('ECONNRESET: Connection reset by peer');
            mockSheetsApi.spreadsheets.values.append
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError)
                .mockResolvedValueOnce({
                    status: 200,
                    data: {
                        updates: {
                            updatedRange: 'Sheet1!A2:G2',
                            updatedRows: 1
                        }
                    }
                });

            mockErrorHandler.handleError.mockResolvedValue({
                shouldRetry: true,
                retryDelay: 1000,
                fallbackActivated: false,
                userMessage: 'Form submitted successfully',
                loggedForRecovery: true
            });

            await service.appendFormData(testFormData);

            expect(mockErrorHandler.handleError).toHaveBeenCalledTimes(2);
            expect(mockLogger.logSheetsOperation).toHaveBeenCalledWith(
                'append',
                'test_sub_123',
                true,
                undefined,
                expect.objectContaining({
                    attempt: 3,
                    updatedRows: 1
                })
            );
        });

        it('should fail after max retries for persistent network errors', async () => {
            const networkError = new Error('ENOTFOUND: DNS lookup failed');
            mockSheetsApi.spreadsheets.values.append.mockRejectedValue(networkError);

            mockErrorHandler.handleError.mockResolvedValue({
                shouldRetry: true,
                retryDelay: 1000,
                fallbackActivated: false,
                userMessage: 'Form submitted successfully',
                loggedForRecovery: true
            });

            await expect(service.appendFormData(testFormData)).rejects.toThrow(
                'Failed to append data to Google Sheets after 3 attempts'
            );

            expect(mockErrorHandler.handleError).toHaveBeenCalledTimes(3);
            expect(mockErrorHandler.logForManualRecovery).toHaveBeenCalledWith(
                'test_sub_123',
                testFormData,
                networkError,
                'append_form_data'
            );
        });
    });

    describe('Rate Limiting Scenarios', () => {
        it('should handle rate limiting with exponential backoff', async () => {
            const rateLimitError = new Error('Rate limit exceeded. Please try again later.');
            mockSheetsApi.spreadsheets.values.append
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({
                    status: 200,
                    data: {
                        updates: {
                            updatedRange: 'Sheet1!A2:G2',
                            updatedRows: 1
                        }
                    }
                });

            mockErrorHandler.handleError.mockResolvedValue({
                shouldRetry: true,
                retryDelay: 5000, // Longer delay for rate limits
                fallbackActivated: false,
                userMessage: 'Form submitted successfully',
                loggedForRecovery: true
            });

            await service.appendFormData(testFormData);

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                rateLimitError,
                expect.objectContaining({
                    operation: 'append_form_data',
                    attemptNumber: 1
                })
            );
        });
    });

    describe('Permission Error Scenarios', () => {
        it('should handle permission denied errors with fallback', async () => {
            const permissionError = new Error('The caller does not have permission');
            mockSheetsApi.spreadsheets.values.append.mockRejectedValue(permissionError);

            mockErrorHandler.handleError.mockResolvedValue({
                shouldRetry: false,
                fallbackActivated: true,
                userMessage: 'Form submitted successfully',
                loggedForRecovery: true
            });

            await expect(service.appendFormData(testFormData)).rejects.toThrow(
                'Failed to append data to Google Sheets after 3 attempts'
            );

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                permissionError,
                expect.objectContaining({
                    operation: 'append_form_data'
                })
            );

            expect(mockErrorHandler.logForManualRecovery).toHaveBeenCalledWith(
                'test_sub_123',
                testFormData,
                permissionError,
                'append_form_data'
            );
        });
    });

    describe('Server Error Scenarios', () => {
        it('should handle server errors with retry logic', async () => {
            const serverError = new Error('Internal server error (500)');
            mockSheetsApi.spreadsheets.values.append
                .mockRejectedValueOnce(serverError)
                .mockResolvedValueOnce({
                    status: 200,
                    data: {
                        updates: {
                            updatedRange: 'Sheet1!A2:G2',
                            updatedRows: 1
                        }
                    }
                });

            mockErrorHandler.handleError.mockResolvedValue({
                shouldRetry: true,
                retryDelay: 2000,
                fallbackActivated: false,
                userMessage: 'Form submitted successfully',
                loggedForRecovery: true
            });

            await service.appendFormData(testFormData);

            expect(mockLogger.logSheetsOperation).toHaveBeenCalledWith(
                'append',
                'test_sub_123',
                true,
                undefined,
                expect.objectContaining({
                    attempt: 2
                })
            );
        });
    });

    describe('Data Validation Scenarios', () => {
        it('should handle malformed response data', async () => {
            mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
                status: 200,
                data: null // Malformed response
            });

            await service.appendFormData(testFormData);

            expect(mockLogger.logSheetsOperation).toHaveBeenCalledWith(
                'append',
                'test_sub_123',
                true,
                undefined,
                expect.objectContaining({
                    updatedRange: undefined,
                    updatedRows: undefined
                })
            );
        });

        it('should handle unexpected HTTP status codes', async () => {
            mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
                status: 202, // Unexpected but successful status
                data: {
                    updates: {
                        updatedRange: 'Sheet1!A2:G2',
                        updatedRows: 1
                    }
                }
            });

            await expect(service.appendFormData(testFormData)).rejects.toThrow(
                'Unexpected response status: 202'
            );
        });
    });

    describe('Connection Validation Scenarios', () => {
        it('should handle successful connection validation', async () => {
            mockSheetsApi.spreadsheets.get.mockResolvedValue({
                status: 200,
                data: {
                    properties: {
                        title: 'Test Spreadsheet'
                    }
                }
            });

            const result = await service.validateConnection();

            expect(result).toBe(true);
            expect(mockLogger.logConnectionValidation).toHaveBeenCalledWith(
                true,
                undefined,
                expect.objectContaining({
                    spreadsheetId: testConfig.spreadsheetId,
                    spreadsheetTitle: 'Test Spreadsheet'
                })
            );
        });

        it('should handle connection validation with invalid response', async () => {
            mockSheetsApi.spreadsheets.get.mockResolvedValue({
                status: 200,
                data: null
            });

            const result = await service.validateConnection();

            expect(result).toBe(false);
            expect(mockLogger.logConnectionValidation).toHaveBeenCalledWith(
                false,
                undefined,
                expect.objectContaining({
                    responseStatus: 200
                })
            );
        });
    });

    describe('Performance and Monitoring', () => {
        it('should log performance metrics for successful operations', async () => {
            mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
                status: 200,
                data: {
                    updates: {
                        updatedRange: 'Sheet1!A2:G2',
                        updatedRows: 1
                    }
                }
            });

            await service.appendFormData(testFormData);

            expect(mockErrorHandler.logSuccess).toHaveBeenCalledWith(
                'append_form_data',
                'test_sub_123',
                expect.any(Number),
                expect.objectContaining({
                    attempt: 1,
                    updatedRange: 'Sheet1!A2:G2'
                })
            );
        });

        it('should track submission lifecycle with proper logging', async () => {
            mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
                status: 200,
                data: {
                    updates: {
                        updatedRange: 'Sheet1!A2:G2',
                        updatedRows: 1
                    }
                }
            });

            await service.appendFormData(testFormData);

            expect(mockLogger.logSubmissionStart).toHaveBeenCalledWith('test_sub_123', testFormData);
            expect(mockLogger.logSubmissionSuccess).toHaveBeenCalledWith(
                'test_sub_123',
                testFormData,
                expect.any(Number)
            );
        });
    });
});