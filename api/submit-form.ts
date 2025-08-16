import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

interface FormSubmissionPayload {
  timestamp: string;
  name: string;
  contactMethods: string[];
  email?: string;
  phone?: string;
  socialPlatforms: string[];
  socialMediaHandle: string;
}

/**
 * Validates the incoming form submission payload
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

  return true;
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes form data to prevent injection attacks
 */
function sanitizeFormData(data: FormSubmissionPayload): FormSubmissionPayload {
  return {
    timestamp: new Date().toISOString(),
    name: data.name.trim().substring(0, 100),
    contactMethods: data.contactMethods.map(method => method.trim().substring(0, 50)),
    email: data.email?.trim().substring(0, 100),
    phone: data.phone?.trim().substring(0, 20),
    socialPlatforms: data.socialPlatforms.map(platform => platform.trim().substring(0, 50)),
    socialMediaHandle: data.socialMediaHandle.trim().substring(0, 100)
  };
}

/**
 * Appends form data to Google Sheets
 */
async function appendToGoogleSheets(formData: FormSubmissionPayload): Promise<boolean> {
  try {
    // Create JWT client for service account authentication
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Initialize Sheets API client
    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare row data
    const values = [[
      formData.timestamp,
      formData.name,
      formData.contactMethods.join(', '),
      formData.email || '',
      formData.phone || '',
      formData.socialPlatforms.join(', '),
      formData.socialMediaHandle
    ]];

    // Append data to spreadsheet using the correct API structure
    const request = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: `${process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1'}!A:G`,
      valueInputOption: 'RAW' as const,
      insertDataOption: 'INSERT_ROWS' as const,
      requestBody: {
        values
      }
    };

    const response = await sheets.spreadsheets.values.append(request);
    return response.status === 200;
  } catch (error) {
    console.error('Google Sheets error:', error);
    return false;
  }
}

/**
 * Vercel serverless function to handle form submissions
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    console.log('Form submission received:', {
      timestamp: new Date().toISOString(),
      body: req.body
    });

    // Validate request body
    if (!validateFormData(req.body)) {
      console.warn('Invalid form data received');
      return res.status(400).json({
        success: false,
        message: 'Invalid form data'
      });
    }

    // Sanitize the form data
    const sanitizedData = sanitizeFormData(req.body);

    console.log('Processing form submission:', {
      name: sanitizedData.name,
      contactMethods: sanitizedData.contactMethods,
      socialPlatforms: sanitizedData.socialPlatforms,
      hasEmail: !!sanitizedData.email,
      hasPhone: !!sanitizedData.phone
    });

    // Try to append to Google Sheets if configured
    if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      try {
        const success = await appendToGoogleSheets(sanitizedData);
        if (success) {
          console.log('✅ Data successfully added to Google Sheets');
        } else {
          console.log('❌ Failed to add data to Google Sheets');
        }
      } catch (sheetsError) {
        console.error('Google Sheets error:', sheetsError);
        // Continue anyway - don't fail the user experience
      }
    } else {
      console.log('⚠️ Google Sheets not configured - form data logged only');
    }

    // Always return success response to maintain user experience
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully'
    });

  } catch (error) {
    console.error('Unexpected API error:', error);

    // Return success to user to maintain experience
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully'
    });
  }
}