import { describe, it, expect } from 'vitest';
import { 
  formatFormDataForSubmission, 
  validateFormDataForSubmission, 
  convertToSpreadsheetRow 
} from '../../src/lib/dataFormatter';
import type { FormData } from '../../src/types/form';
import type { FormSubmissionPayload } from '../../src/types/googleSheets';

describe('Data Formatter Unit Tests', () => {
  describe('formatFormDataForSubmission', () => {
    it('should format complete form data correctly', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email', 'phone'],
          email: 'john@example.com',
          phone: '(555) 123-4567'
        },
        platform: ['instagram', 'tiktok'],
        social_media_id: '@johndoe'
      };

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'John Doe',
        contactMethods: ['email', 'phone'],
        email: 'john@example.com',
        phone: '(555) 123-4567',
        socialPlatforms: ['instagram', 'tiktok'],
        socialMediaHandle: '@johndoe'
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should format minimal form data correctly', () => {
      const formData: FormData = {
        name: 'Jane Smith',
        contact_info: {
          methods: ['email'],
          email: 'jane@example.com'
        },
        platform: ['youtube'],
        social_media_id: '@janesmith'
      };

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'Jane Smith',
        contactMethods: ['email'],
        email: 'jane@example.com',
        phone: undefined,
        socialPlatforms: ['youtube'],
        socialMediaHandle: '@janesmith'
      });
    });

    it('should handle phone-only contact method', () => {
      const formData: FormData = {
        name: 'Mike Johnson',
        contact_info: {
          methods: ['phone'],
          phone: '555-987-6543'
        },
        platform: ['linkedin'],
        social_media_id: '@mikejohnson'
      };

      const result = formatFormDataForSubmission(formData);

      expect(result).toEqual({
        timestamp: expect.any(String),
        name: 'Mike Johnson',
        contactMethods: ['phone'],
        email: undefined,
        phone: '555-987-6543',
        socialPlatforms: ['linkedin'],
        socialMediaHandle: '@mikejohnson'
      });
    });

    it('should handle missing optional fields', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        platform: ['instagram'],
        social_media_id: '@testuser'
      };

      const result = formatFormDataForSubmission(formData);

      expect(result.phone).toBeUndefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should trim whitespace from string fields', () => {
      const formData: FormData = {
        name: '  John Doe  ',
        contact_info: {
          methods: ['email'],
          email: '  john@example.com  '
        },
        platform: ['instagram'],
        social_media_id: '  @johndoe  '
      };

      const result = formatFormDataForSubmission(formData);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.socialMediaHandle).toBe('@johndoe');
    });

    it('should handle empty or undefined contact info', () => {
      const formData: FormData = {
        name: 'Test User',
        platform: ['instagram'],
        social_media_id: '@testuser'
      };

      const result = formatFormDataForSubmission(formData);

      expect(result.contactMethods).toEqual([]);
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it('should handle empty or undefined platforms', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        social_media_id: '@testuser'
      };

      const result = formatFormDataForSubmission(formData);

      expect(result.socialPlatforms).toEqual([]);
    });
  });

  describe('validateFormDataForSubmission', () => {
    it('should validate complete valid form data', () => {
      const formData: FormData = {
        name: 'John Doe',
        contact_info: {
          methods: ['email', 'phone'],
          email: 'john@example.com',
          phone: '(555) 123-4567'
        },
        platform: ['instagram', 'tiktok'],
        social_media_id: '@johndoe'
      };

      expect(validateFormDataForSubmission(formData)).toBe(true);
    });

    it('should validate minimal valid form data', () => {
      const formData: FormData = {
        name: 'Jane Smith',
        contact_info: {
          methods: ['email'],
          email: 'jane@example.com'
        },
        platform: ['youtube'],
        social_media_id: '@janesmith'
      };

      expect(validateFormDataForSubmission(formData)).toBe(true);
    });

    it('should reject form data with missing name', () => {
      const formData: FormData = {
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with empty name', () => {
      const formData: FormData = {
        name: '   ',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with empty contact methods', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: []
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing contact methods', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {},
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with invalid email when email is selected', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'invalid-email'
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing email when email is selected', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email']
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with invalid phone when phone is selected', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['phone'],
          phone: '123' // Too short
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing phone when phone is selected', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['phone']
        },
        platform: ['instagram'],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with empty social platforms', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        platform: [],
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing social platforms', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        social_media_id: '@test'
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with empty social media handle', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        platform: ['instagram'],
        social_media_id: ''
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should reject form data with missing social media handle', () => {
      const formData: FormData = {
        name: 'Test User',
        contact_info: {
          methods: ['email'],
          email: 'test@example.com'
        },
        platform: ['instagram']
      };

      expect(validateFormDataForSubmission(formData)).toBe(false);
    });

    it('should validate various phone number formats', () => {
      const phoneFormats = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '5551234567',
        '+1 555 123 4567',
        '+1-555-123-4567'
      ];

      phoneFormats.forEach(phone => {
        const formData: FormData = {
          name: 'Test User',
          contact_info: {
            methods: ['phone'],
            phone
          },
          platform: ['instagram'],
          social_media_id: '@test'
        };

        expect(validateFormDataForSubmission(formData)).toBe(true);
      });
    });

    it('should validate various email formats', () => {
      const emailFormats = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com'
      ];

      emailFormats.forEach(email => {
        const formData: FormData = {
          name: 'Test User',
          contact_info: {
            methods: ['email'],
            email
          },
          platform: ['instagram'],
          social_media_id: '@test'
        };

        expect(validateFormDataForSubmission(formData)).toBe(true);
      });
    });
  });

  describe('convertToSpreadsheetRow', () => {
    it('should convert form submission payload to spreadsheet row format', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.123Z',
        name: 'John Doe',
        contactMethods: ['email', 'phone'],
        email: 'john@example.com',
        phone: '(555) 123-4567',
        socialPlatforms: ['instagram', 'tiktok'],
        socialMediaHandle: '@johndoe'
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result).toEqual({
        timestamp: expect.any(String), // Locale-formatted timestamp
        name: 'John Doe',
        contactMethods: 'email, phone',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        socialPlatforms: 'instagram, tiktok',
        socialMediaHandle: '@johndoe'
      });

      // Verify timestamp is formatted as locale string
      expect(result.timestamp).toBe(new Date(payload.timestamp).toLocaleString());
    });

    it('should handle minimal form submission payload', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.123Z',
        name: 'Jane Smith',
        contactMethods: ['email'],
        email: 'jane@example.com',
        socialPlatforms: ['youtube'],
        socialMediaHandle: '@janesmith'
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result).toEqual({
        timestamp: new Date(payload.timestamp).toLocaleString(),
        name: 'Jane Smith',
        contactMethods: 'email',
        email: 'jane@example.com',
        phone: '',
        socialPlatforms: 'youtube',
        socialMediaHandle: '@janesmith'
      });
    });

    it('should handle phone-only contact method', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.123Z',
        name: 'Mike Johnson',
        contactMethods: ['phone'],
        phone: '555-987-6543',
        socialPlatforms: ['linkedin'],
        socialMediaHandle: '@mikejohnson'
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result).toEqual({
        timestamp: new Date(payload.timestamp).toLocaleString(),
        name: 'Mike Johnson',
        contactMethods: 'phone',
        email: '',
        phone: '555-987-6543',
        socialPlatforms: 'linkedin',
        socialMediaHandle: '@mikejohnson'
      });
    });

    it('should handle multiple social platforms', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.123Z',
        name: 'Sarah Wilson',
        contactMethods: ['email', 'phone'],
        email: 'sarah@company.com',
        phone: '+1-555-111-2222',
        socialPlatforms: ['instagram', 'tiktok', 'youtube', 'linkedin'],
        socialMediaHandle: '@sarahwilson'
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result.socialPlatforms).toBe('instagram, tiktok, youtube, linkedin');
      expect(result.contactMethods).toBe('email, phone');
    });

    it('should handle single contact method and platform', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.123Z',
        name: 'Alex Chen',
        contactMethods: ['email'],
        email: 'alex@startup.io',
        socialPlatforms: ['twitter'],
        socialMediaHandle: '@alexchen'
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result.socialPlatforms).toBe('twitter');
      expect(result.contactMethods).toBe('email');
    });

    it('should handle empty arrays gracefully', () => {
      const payload: FormSubmissionPayload = {
        timestamp: '2024-01-15T14:30:25.123Z',
        name: 'Test User',
        contactMethods: [],
        socialPlatforms: [],
        socialMediaHandle: '@testuser'
      };

      const result = convertToSpreadsheetRow(payload);

      expect(result.socialPlatforms).toBe('');
      expect(result.contactMethods).toBe('');
    });
  });
});