import { formatFormDataForSubmission, validateFormDataForSubmission, convertToSpreadsheetRow } from '../dataFormatter';
import type { FormData } from '../../types/form';
import type { FormSubmissionPayload } from '../../types/googleSheets';

describe('dataFormatter', () => {
  describe('formatFormDataForSubmission', () => {
    it('should format complete form data correctly', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email', 'phone'],
          email: 'john@example.com',
          phone: '(555) 123-4567',
        },
        platform: ['instagram', 'tiktok'],
        social_media_id: '@johndoe',
        address: '123 Main St, Anytown, NY 12345',
      };

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'John Doe',
        contactMethods: ['email', 'phone'],
        email: 'john@example.com',
        phone: '(555) 123-4567',
        socialPlatforms: ['instagram', 'tiktok'],
        socialMediaHandle: '@johndoe',
        address: '123 Main St, Anytown, NY 12345',
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should handle minimal form data with only email contact', () => {
      const formData: FormData = {
        name: 'Jane Smith',
        contact_info: {
          methods: ['email'],
          email: 'jane@example.com',
        },
        platform: ['instagram'],
        social_media_id: '@janesmith',
      };

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'Jane Smith',
        contactMethods: ['email'],
        email: 'jane@example.com',
        phone: undefined,
        socialPlatforms: ['instagram'],
        socialMediaHandle: '@janesmith',
        address: undefined,
      });
    });

    it('should handle minimal form data with only phone contact', () => {
      const formData: FormData = {
        name: 'Bob Johnson',
        contact_info: {
          methods: ['phone'],
          phone: '555-987-6543',
        },
        platform: ['tiktok'],
        social_media_id: '@bobjohnson',
      };

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'Bob Johnson',
        contactMethods: ['phone'],
        email: undefined,
        phone: '555-987-6543',
        socialPlatforms: ['tiktok'],
        socialMediaHandle: '@bobjohnson',
        address: undefined,
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com',
        },
        platform: ['instagram'],
        social_media_id: '@testuser',
      };

      const result = formatFormDataForSubmission(formData);

      expect(result.phone).toBeUndefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should handle empty or missing form data gracefully', () => {
      const formData: FormData = {};

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: '',
        contactMethods: [],
        email: undefined,
        phone: undefined,
        socialPlatforms: [],
        socialMediaHandle: '',
        address: undefined,
      });
    });

    it('should trim whitespace from string fields', () => {
      const formData: FormData = {
        name: '  John Doe  ',
        contact_info: {
          methods: ['email'],
          email: '  john@example.com  ',
        },
        platform: ['instagram'],
        social_media_id: '  @johndoe  ',
      };

      const result = formatFormDataForSubmission(formData);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.socialMediaHandle).toBe('@johndoe');
    });
  });

  describe('validateFormDataForSubmission', () => {
    it('should validate complete valid form data', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email'],
          email: 'john@example.com',
        },
        platform: ['instagram'],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(true);
    });

    it('should validate form data with phone contact', () => {
      const formData: FormData = {
        name: 'Jane Smith',
        contact_info: {
          methods: ['phone'],
          phone: '(555) 123-4567',
        },
        platform: ['tiktok'],
        social_media_id: '@janesmith',
      };

      expect(validateFormDataForSubmission(formData)).toBe(true);
    });

    it('should validate form data with both email and phone', () => {
      const formData: FormData = {
        name: 'Bob Johnson',
        contact_info: {
          methods: ['email', 'phone'],
          email: 'bob@example.com',
          phone: '555-987-6543',
        },
        platform: ['instagram', 'tiktok'],
        social_media_id: '@bobjohnson',
      };

      expect(validateFormDataForSubmission(formData)).toBe(true);
    });

    it('should reject form data with missing name', () => {
      const formData: FormData = {
        contact_info: {
          methods: ['email'],
          email: 'test@example.com',
        },
        platform: ['instagram'],
        social_media_id: '@testuser',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with empty name', () => {
      const formData: FormData = {
        name: '   ',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com',
        },
        platform: ['instagram'],
        social_media_id: '@testuser',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing contact methods', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: [],
        },
        platform: ['instagram'],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with invalid email when email method is selected', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email'],
          email: 'invalid-email',
        },
        platform: ['instagram'],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing email when email method is selected', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email'],
        },
        platform: ['instagram'],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with invalid phone when phone method is selected', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['phone'],
          phone: '123', // Too short
        },
        platform: ['instagram'],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing phone when phone method is selected', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['phone'],
        },
        platform: ['instagram'],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing social platforms', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email'],
          email: 'john@example.com',
        },
        platform: [],
        social_media_id: '@johndoe',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing social media handle', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email'],
          email: 'john@example.com',
        },
        platform: ['instagram'],
        social_media_id: '',
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should accept valid phone numbers with various formats', () => {
      const validPhones = [
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+1 555 123 4567',
        '555.123.4567',
      ];

      validPhones.forEach(phone => {
        const formData: FormData = {
          name: 'John Doe',
          contact_info: {
            methods: ['phone'],
            phone,
          },
          platform: ['instagram'],
          social_media_id: '@johndoe',
        };

        expect(validateFormDataForSubmission(formData)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '12345',
        'abc-def-ghij',
        '',
        '   ',
      ];

      invalidPhones.forEach(phone => {
        const formData: FormData = {
          name: 'John Doe',
          contact_info: {
            methods: ['phone'],
            phone,
          },
          platform: ['instagram'],
          social_media_id: '@johndoe',
        };

        expect(validateFormDataForSubmission(formData)).toBe(false);
      });
    });

    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      validEmails.forEach(email => {
        const formData: FormData = {
          name: 'John Doe',
          contact_info: {
            methods: ['email'],
            email,
          },
          platform: ['instagram'],
          social_media_id: '@johndoe',
        };

        expect(validateFormDataForSubmission(formData)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        '',
        '   ',
      ];

      invalidEmails.forEach(email => {
        const formData: FormData = {
          name: 'John Doe',
          contact_info: {
            methods: ['email'],
            email,
          },
          platform: ['instagram'],
          social_media_id: '@johndoe',
        };

        expect(validateFormDataForSubmission(formData)).toBe(false);
      });
    });
  });

  describe('convertToSpreadsheetRow', () => {
    it('should convert form submission payload to spreadsheet row format', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.000Z',
        name: 'John Doe',
        contactMethods: ['email', 'phone'],
        email: 'john@example.com',
        phone: '(555) 123-4567',
        socialPlatforms: ['instagram', 'tiktok'],
        socialMediaHandle: '@johndoe',
        address: '123 Main St, Anytown, NY 12345',
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result).toEqual({
        timestamp: expect.any(String), // Locale-specific date format
        name: 'John Doe',
        contactMethods: 'email, phone',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        socialPlatforms: 'instagram, tiktok',
        socialMediaHandle: '@johndoe',
        address: '123 Main St, Anytown, NY 12345',
      });

      // Verify timestamp is formatted as locale string
      expect(result.timestamp).toContain('2024');
    });

    it('should handle missing optional fields in spreadsheet conversion', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.000Z',
        name: 'Jane Smith',
        contactMethods: ['email'],
        socialPlatforms: ['instagram'],
        socialMediaHandle: '@janesmith',
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'Jane Smith',
        contactMethods: 'email',
        email: '',
        phone: '',
        socialPlatforms: 'instagram',
        socialMediaHandle: '@janesmith',
        address: '',
      });
    });

    it('should handle empty arrays in spreadsheet conversion', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.000Z',
        name: 'Test User',
        contactMethods: [],
        socialPlatforms: [],
        socialMediaHandle: '@testuser',
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'Test User',
        contactMethods: '',
        email: '',
        phone: '',
        socialPlatforms: '',
        socialMediaHandle: '@testuser',
        address: '',
      });
    });
  });
});