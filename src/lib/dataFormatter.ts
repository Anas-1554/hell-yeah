import type { FormData } from '../types/form';
import type { FormSubmissionPayload } from '../types/googleSheets';

/**
 * Converts form answers to Google Sheets API payload format
 * @param answers - Raw form answers from useFormState
 * @returns FormSubmissionPayload formatted for API submission
 */
export function formatFormDataForSubmission(answers: FormData): FormSubmissionPayload {
  // Extract name
  const name = String(answers.name || '').trim();
  
  // Extract contact information
  const contactInfo = answers.contact_info as { methods?: string[], email?: string, phone?: string } | undefined;
  const contactMethods = contactInfo?.methods || [];
  const email = contactInfo?.email?.trim() || undefined;
  const phone = contactInfo?.phone?.trim() || undefined;
  
  // Extract social platforms
  const platforms = answers.platform as string[] | undefined;
  const socialPlatforms = platforms || [];
  
  // Extract social media handle
  const socialMediaHandle = String(answers.social_media_id || '').trim();
  
  // Extract address (optional)
  const address = String(answers.address || '').trim() || undefined;
  
  return {
    timestamp: new Date().toISOString(),
    name,
    contactMethods,
    email,
    phone,
    socialPlatforms,
    socialMediaHandle,
    address
  };
}

/**
 * Validates that the form data contains all required fields for submission
 * @param answers - Raw form answers from useFormState
 * @returns boolean indicating if data is valid for submission
 */
export function validateFormDataForSubmission(answers: FormData): boolean {
  // Check required name
  const name = String(answers.name || '').trim();
  if (!name) return false;
  
  // Check required contact info
  const contactInfo = answers.contact_info as { methods?: string[], email?: string, phone?: string } | undefined;
  if (!contactInfo?.methods || contactInfo.methods.length === 0) return false;
  
  // Validate email if provided
  if (contactInfo.methods.includes('email')) {
    const email = contactInfo.email?.trim();
    if (!email || !isValidEmail(email)) return false;
  }
  
  // Validate phone if provided
  if (contactInfo.methods.includes('phone')) {
    const phone = contactInfo.phone?.trim();
    if (!phone || !isValidPhone(phone)) return false;
  }
  
  // Check required social platforms
  const platforms = answers.platform as string[] | undefined;
  if (!platforms || platforms.length === 0) return false;
  
  // Check required social media handle
  const socialMediaHandle = String(answers.social_media_id || '').trim();
  if (!socialMediaHandle) return false;
  
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
 * Basic phone validation
 * @param phone - Phone string to validate
 * @returns boolean - true if valid phone format (at least 10 digits)
 */
function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Converts form submission payload to spreadsheet row format
 * @param data - FormSubmissionPayload to convert
 * @returns SpreadsheetRowData formatted for Google Sheets
 */
export function convertToSpreadsheetRow(data: FormSubmissionPayload): import('../types/googleSheets').SpreadsheetRowData {
  return {
    timestamp: new Date(data.timestamp).toLocaleString(),
    name: data.name,
    contactMethods: data.contactMethods.join(', '),
    email: data.email || '',
    phone: data.phone || '',
    socialPlatforms: data.socialPlatforms.join(', '),
    socialMediaHandle: data.socialMediaHandle,
    address: data.address || ''
  };
}