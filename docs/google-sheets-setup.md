# Google Sheets Integration Setup Guide

This guide will walk you through setting up the Google Sheets integration for the form submission system.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- A Google Sheets spreadsheet where you want to store form submissions

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Form Submissions Integration")
5. Click "Create"

## Step 2: Enable the Google Sheets API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API" from the results
4. Click "Enable"

## Step 3: Create a Service Account

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - **Service account name**: `form-submissions-service`
   - **Service account ID**: This will be auto-generated
   - **Description**: `Service account for form submissions to Google Sheets`
4. Click "Create and Continue"
5. Skip the optional steps by clicking "Done"

## Step 4: Generate Service Account Key

### Option A: Standard Key Creation (If Allowed)

1. In the "Credentials" page, find your newly created service account
2. Click on the service account name to open its details
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" as the key type
6. Click "Create"
7. A JSON file will be downloaded to your computer - **keep this file secure!**

### Option B: If Key Creation is Disabled (Organization Policy)

If you see an error like "Service account key creation is disabled" with policy ID `iam.disableServiceAccountKeyCreation`, you have several alternatives:

#### Alternative 1: Request Admin Assistance
Contact your organization's Google Cloud administrator to:
- Temporarily disable the policy for your project
- Create the service account key on your behalf
- Grant you the necessary permissions

#### Alternative 2: Use Workload Identity (Recommended for Production)
If deploying on Google Cloud Platform:
1. Set up Workload Identity Federation
2. Configure your deployment to use the service account without keys
3. This is more secure as it eliminates the need for long-lived keys

#### Alternative 3: Use Application Default Credentials
If running on Google Cloud services (Cloud Run, App Engine, etc.):
1. Attach the service account to your compute resource
2. Use Application Default Credentials in your code
3. No explicit key file needed

#### Alternative 4: Use a Different Authentication Method
Consider using OAuth 2.0 flow for user authentication instead of service account:
1. Implement OAuth 2.0 with Google Sheets API
2. Users authenticate with their own Google accounts
3. Requires user consent but no service account keys

#### Alternative 5: Use Google Apps Script (Workaround)
Create a Google Apps Script that acts as a proxy:
1. Create a Google Apps Script project
2. Write a script that receives HTTP requests and writes to Sheets
3. Deploy as a web app
4. Your application calls the Apps Script endpoint instead of Sheets API directly

## Step 5: Prepare Your Google Sheets Spreadsheet

1. Create a new Google Sheets spreadsheet or use an existing one
2. Set up the column headers in the first row:
   - **A1**: `Timestamp`
   - **B1**: `Name`
   - **C1**: `Contact Methods`
   - **D1**: `Email`
   - **E1**: `Phone`
   - **F1**: `Social Platforms`
   - **G1**: `Social Media Handle`

3. Copy the spreadsheet ID from the URL:
   - The URL looks like: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part

4. Share the spreadsheet with the service account:
   - Click "Share" in the top-right corner
   - Add the service account email (found in the JSON key file as `client_email`)
   - Give it "Editor" permissions
   - Uncheck "Notify people" since it's a service account
   - Click "Share"

## Step 6: Extract Environment Variables

**Note**: This step only applies if you successfully created a service account key in Step 4. If using alternative authentication methods, skip to the relevant configuration section.

From the downloaded JSON key file, extract the following values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "form-submissions-service@your-project-id.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

You'll need:
- `private_key` - The entire private key including the BEGIN/END lines
- `client_email` - The service account email address

## Step 7: Configure Environment Variables

Set up the following environment variables in your deployment environment:

### Required Variables

```bash
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="form-submissions-service@your-project-id.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id-from-url"
GOOGLE_SHEETS_SHEET_NAME="Sheet1"
```

### Important Notes

- **Private Key**: Copy the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- **Newlines**: The private key contains `\n` characters that must be preserved
- **Sheet Name**: Use the exact name of the sheet tab (default is "Sheet1")
- **Security**: Never commit these values to version control

## Step 8: Verify the Setup

### Test Connection

You can test the connection by running the integration tests:

```bash
npm run test:run tests/integration/
```

### Manual Verification

1. Submit a test form through your application
2. Check the Google Sheets spreadsheet for the new row
3. Verify all data is formatted correctly
4. Check the application logs for any errors

## Troubleshooting

### Common Issues

#### "Insufficient permissions" Error
- Ensure the service account email has "Editor" access to the spreadsheet
- Verify the spreadsheet ID is correct
- Check that the Google Sheets API is enabled

#### "Authentication failed" Error
- Verify the private key is copied correctly with all newlines
- Ensure the client email matches the service account
- Check that the service account key is active (not deleted)

#### "Spreadsheet not found" Error
- Verify the spreadsheet ID in the environment variable
- Ensure the spreadsheet is shared with the service account
- Check that the spreadsheet exists and is accessible

#### "Sheet not found" Error
- Verify the sheet name matches exactly (case-sensitive)
- Ensure the sheet tab exists in the spreadsheet
- Check for any special characters in the sheet name

### Debug Steps

1. **Check Environment Variables**:
   ```bash
   # In your deployment environment
   echo $GOOGLE_SHEETS_CLIENT_EMAIL
   echo $GOOGLE_SHEETS_SPREADSHEET_ID
   echo $GOOGLE_SHEETS_SHEET_NAME
   # Don't echo the private key for security
   ```

2. **Verify Service Account Permissions**:
   - Go to the Google Sheets spreadsheet
   - Check if the service account email appears in the sharing settings
   - Ensure it has "Editor" permissions

3. **Test API Access**:
   - Use the Google Sheets API Explorer to test access
   - Try reading the spreadsheet metadata with the service account

4. **Check Application Logs**:
   - Look for detailed error messages in the application logs
   - Check for authentication, connection, and API errors

### Security Best Practices

1. **Rotate Keys Regularly**: Generate new service account keys periodically (if using keys)
2. **Limit Permissions**: Only give the service account access to the specific spreadsheet
3. **Monitor Usage**: Check Google Cloud Console for API usage and errors
4. **Secure Storage**: Store environment variables securely in your deployment platform
5. **Access Logs**: Monitor who has access to the service account and spreadsheet
6. **Consider Keyless Authentication**: Use Workload Identity or Application Default Credentials when possible to avoid managing keys

## Next Steps

After completing the setup:

1. Deploy your application with the environment variables
2. Test the form submission flow end-to-end
3. Monitor the Google Sheets for incoming data
4. Set up alerts for any integration failures
5. Consider implementing data backup and archival processes

## Support

If you encounter issues:

1. Check the application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the Google Sheets API access manually
4. Review the troubleshooting section above
5. Consult the Google Sheets API documentation for advanced configuration

## Additional Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Google Sheets API Quickstart](https://developers.google.com/sheets/api/quickstart/nodejs)
- [Google Cloud Console](https://console.cloud.google.com/)