# Data Formatting Utilities

This directory contains utility functions for formatting form data for Google Sheets integration.

## dataFormatter.ts

Contains functions to convert form submission data into spreadsheet-friendly formats.

### Key Functions

- `formatMultiSelectToString()` - Converts arrays to comma-separated strings
- `formatContactInformation()` - Formats contact data (methods, email, phone)
- `formatSocialPlatforms()` - Maps platform values to readable labels
- `formatSocialMediaHandle()` - Ensures handles have proper @ prefix
- `convertToSubmissionPayload()` - Converts raw form data to API payload format
- `convertToSpreadsheetRow()` - Converts payload to spreadsheet row format
- `formatFormDataForSpreadsheet()` - Main function for direct form-to-spreadsheet conversion

### Usage

```typescript
import { formatFormDataForSpreadsheet } from './dataFormatter';

const rawFormData = {
  name: 'John Doe',
  contact_info: {
    methods: ['email', 'phone'],
    email: 'john@example.com',
    phone: '(555) 123-4567'
  },
  platform: ['instagram', 'tiktok'],
  social_media_id: 'johndoe'
};

const spreadsheetData = formatFormDataForSpreadsheet(rawFormData);
// Returns formatted data ready for Google Sheets insertion
```

### Testing

Run tests with:
```bash
npm run test:run
```

All functions include comprehensive unit tests covering edge cases and error handling.