// Environment configuration for Google Sheets integration
import type { GoogleSheetsConfig } from '../types/googleSheets';

export const getGoogleSheetsConfig = (): GoogleSheetsConfig => {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;

  if (!privateKey) {
    throw new Error('GOOGLE_SHEETS_PRIVATE_KEY environment variable is required');
  }

  if (!clientEmail) {
    throw new Error('GOOGLE_SHEETS_CLIENT_EMAIL environment variable is required');
  }

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
  }

  if (!sheetName) {
    throw new Error('GOOGLE_SHEETS_SHEET_NAME environment variable is required');
  }

  // Handle the private key format - it might be base64 encoded or have escaped newlines
  let formattedPrivateKey = privateKey;
  
  // If the key doesn't start with -----BEGIN, it might be base64 encoded
  if (!privateKey.startsWith('-----BEGIN')) {
    try {
      formattedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf8');
    } catch (error) {
      // If base64 decoding fails, assume it's already in the correct format
      formattedPrivateKey = privateKey;
    }
  }
  
  // Replace escaped newlines with actual newlines
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

  return {
    privateKey: formattedPrivateKey,
    clientEmail,
    spreadsheetId,
    sheetName,
  };
};

export const validateGoogleSheetsConfig = (): boolean => {
  try {
    getGoogleSheetsConfig();
    return true;
  } catch (error) {
    console.error('Google Sheets configuration validation failed:', error);
    return false;
  }
};