# Design Document

## Overview

This design outlines the integration of Google Sheets with the existing dynamic form application. The solution will use Google Sheets API v4 with service account authentication to write form submissions directly to a spreadsheet. The integration will be implemented as a Vercel serverless function to handle the API calls securely, while the frontend will send form data via a POST request to this endpoint.

## Architecture

### High-Level Architecture

```
[React Form] → [Vercel API Route] → [Google Sheets API] → [Google Spreadsheet]
     ↓
[Success Message to User]
```

### Component Interaction Flow

1. **Form Submission**: User completes form and clicks submit
2. **Data Processing**: Frontend formats form data for transmission
3. **API Call**: Frontend sends POST request to `/api/submit-form` endpoint
4. **Authentication**: Vercel function authenticates with Google Sheets using service account
5. **Data Writing**: Formatted data is appended to the designated Google Sheet
6. **Response Handling**: Success/error response is handled gracefully
7. **User Feedback**: User sees success message regardless of Google Sheets result

### Technology Stack

- **Frontend**: Existing React/TypeScript application
- **Backend**: Vercel serverless functions (Node.js)
- **API**: Google Sheets API v4
- **Authentication**: Google Service Account with JSON key
- **Deployment**: Vercel with environment variables for credentials

## Components and Interfaces

### 1. Frontend Form Submission Handler

**Location**: `src/hooks/useFormState.ts` (modify existing `submitForm` function)

**Responsibilities**:
- Format form data for API transmission
- Send POST request to Vercel API endpoint
- Handle response and maintain existing user experience
- Implement timeout and error handling

**Interface**:
```typescript
interface FormSubmissionPayload {
  timestamp: string;
  name: string;
  contactMethods: string[];
  email?: string;
  phone?: string;
  socialPlatforms: string[];
  socialMediaHandle: string;
}
```

### 2. Vercel API Route

**Location**: `pages/api/submit-form.ts` (new file)

**Responsibilities**:
- Receive form data from frontend
- Authenticate with Google Sheets API
- Format data for spreadsheet insertion
- Handle errors gracefully
- Return appropriate responses

**Interface**:
```typescript
// Request
interface SubmitFormRequest {
  method: 'POST';
  body: FormSubmissionPayload;
}

// Response
interface SubmitFormResponse {
  success: boolean;
  message: string;
  error?: string;
}
```

### 3. Google Sheets Service

**Location**: `lib/googleSheets.ts` (new file)

**Responsibilities**:
- Initialize Google Sheets API client
- Authenticate using service account
- Format data for spreadsheet rows
- Append data to designated sheet
- Handle API errors and retries

**Interface**:
```typescript
interface GoogleSheetsService {
  appendFormData(data: FormSubmissionPayload): Promise<void>;
  validateConnection(): Promise<boolean>;
}
```

### 4. Data Formatter

**Location**: `lib/dataFormatter.ts` (new file)

**Responsibilities**:
- Convert form data to spreadsheet-friendly format
- Handle multi-select fields (arrays to comma-separated strings)
- Format contact information clearly
- Convert boolean values to readable text

## Data Models

### Spreadsheet Schema

The Google Sheet will have the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | Submission date/time | "2024-01-15 14:30:25" |
| Name | User's full name | "John Doe" |
| Contact Methods | Selected contact methods | "Email, Phone" |
| Email | Email address (if provided) | "john@example.com" |
| Phone | Phone number (if provided) | "(555) 123-4567" |
| Social Platforms | Selected social platforms | "Instagram, TikTok" |
| Social Media Handle | User's social media handle | "@johndoe" |

### Environment Variables

Required environment variables for Vercel deployment:

```
GOOGLE_SHEETS_PRIVATE_KEY=<service-account-private-key>
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account-email>
GOOGLE_SHEETS_SPREADSHEET_ID=<target-spreadsheet-id>
GOOGLE_SHEETS_SHEET_NAME=<sheet-tab-name>
```

## Error Handling

### Error Categories and Responses

1. **Authentication Errors**
   - Log detailed error for debugging
   - Return generic success to user
   - Set up monitoring alerts

2. **API Rate Limiting**
   - Implement exponential backoff retry logic
   - Queue submissions if necessary
   - Log rate limit encounters

3. **Network Errors**
   - Timeout after 10 seconds
   - Return success to user
   - Log error with submission data for manual retry

4. **Data Validation Errors**
   - Validate data format before API call
   - Log validation failures
   - Attempt to sanitize and retry

### Error Logging Strategy

- Use structured logging with submission ID
- Include enough context for manual data recovery
- Separate user-facing responses from internal error details
- Set up monitoring for error patterns

## Testing Strategy

### Unit Tests

1. **Data Formatter Tests**
   - Test conversion of form data to spreadsheet format
   - Test handling of missing optional fields
   - Test multi-select field formatting

2. **Google Sheets Service Tests**
   - Mock Google Sheets API responses
   - Test authentication flow
   - Test error handling scenarios

3. **API Route Tests**
   - Test request/response handling
   - Test error scenarios
   - Test data validation

### Integration Tests

1. **End-to-End Form Submission**
   - Test complete flow from form to spreadsheet
   - Verify data appears correctly in Google Sheets
   - Test error scenarios with real API

2. **Authentication Testing**
   - Test service account setup
   - Verify permissions are sufficient
   - Test credential rotation

### Manual Testing Checklist

1. Form submission with all fields completed
2. Form submission with minimal required fields
3. Form submission with various contact method combinations
4. Error scenarios (invalid credentials, network issues)
5. Spreadsheet data verification and formatting
6. Performance testing under load

## Security Considerations

### Service Account Security

- Use dedicated service account with minimal permissions
- Store private key securely in Vercel environment variables
- Rotate credentials periodically
- Monitor for unauthorized access

### Data Privacy

- Ensure HTTPS for all API communications
- Validate and sanitize all input data
- Log minimal PII in error messages
- Comply with data retention policies

### API Security

- Implement rate limiting on API endpoint
- Validate request origin if needed
- Use CORS appropriately
- Monitor for abuse patterns

## Performance Considerations

### Optimization Strategies

1. **Asynchronous Processing**
   - Don't block user interface for Google Sheets API calls
   - Use fire-and-forget pattern for submissions

2. **Caching and Batching**
   - Consider batching multiple submissions if volume is high
   - Cache authentication tokens when possible

3. **Timeout Management**
   - Set reasonable timeouts for API calls
   - Implement circuit breaker pattern if needed

4. **Monitoring**
   - Track API response times
   - Monitor success/failure rates
   - Set up alerts for performance degradation

## Deployment Strategy

### Vercel Configuration

1. **Environment Variables Setup**
   - Configure all required Google Sheets credentials
   - Set up different environments (development, production)

2. **Function Configuration**
   - Optimize serverless function memory allocation
   - Set appropriate timeout values
   - Configure regions for optimal performance

3. **Monitoring Setup**
   - Enable Vercel function logs
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Configure uptime monitoring

### Google Cloud Setup

1. **Service Account Creation**
   - Create dedicated service account for the application
   - Generate and securely store JSON key
   - Configure minimal required permissions

2. **Spreadsheet Preparation**
   - Create target Google Sheet
   - Set up column headers
   - Share sheet with service account email
   - Configure appropriate permissions (edit access)

## Migration and Rollback Plan

### Deployment Steps

1. Set up Google Cloud service account and spreadsheet
2. Configure Vercel environment variables
3. Deploy API route and supporting libraries
4. Update frontend form submission logic
5. Test end-to-end functionality
6. Monitor for issues and performance

### Rollback Strategy

- Keep existing console.log functionality as fallback
- Feature flag for Google Sheets integration
- Quick rollback by reverting frontend changes
- Maintain user experience during any issues