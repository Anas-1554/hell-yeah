// TypeScript interfaces for Google Sheets integration

export interface FormSubmissionPayload {
  timestamp: string;
  name: string;
  contactMethods: string[];
  email?: string;
  phone?: string;
  socialPlatforms: string[];
  socialMediaHandle: string;
  address?: string;
}

export interface SubmitFormRequest {
  method: 'POST';
  body: FormSubmissionPayload;
}

export interface SubmitFormResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface GoogleSheetsConfig {
  privateKey: string;
  clientEmail: string;
  spreadsheetId: string;
  sheetName: string;
}

export interface GoogleSheetsService {
  appendFormData(data: FormSubmissionPayload): Promise<void>;
  validateConnection(): Promise<boolean>;
}

// Interface for the raw form data from the form state
export interface RawFormData {
  [questionId: string]: string | string[] | number | boolean | { methods?: string[], email?: string, phone?: string };
}

// Interface for formatted spreadsheet row data
export interface SpreadsheetRowData {
  timestamp: string;
  name: string;
  contactMethods: string;
  email: string;
  phone: string;
  socialPlatforms: string;
  socialMediaHandle: string;
  address: string;
}