import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets helper function
async function appendToGoogleSheets(formData) {
  try {
    // Create JWT client for service account authentication
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

    // Append data to spreadsheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `${process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1'}!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });

    return response.status === 200;
  } catch (error) {
    console.error('Google Sheets error:', error.message);
    return false;
  }
}

// Simple form submission handler
app.post('/api/submit-form', async (req, res) => {
  console.log('📝 Form submission received:', {
    timestamp: new Date().toISOString(),
    body: req.body
  });

  try {
    // Basic validation
    if (!req.body || !req.body.name || !req.body.socialMediaHandle) {
      return res.status(400).json({
        success: false,
        message: 'Invalid form data'
      });
    }

    // Prepare the data
    const formData = {
      timestamp: new Date().toISOString(),
      name: req.body.name,
      contactMethods: req.body.contactMethods || [],
      email: req.body.email || '',
      phone: req.body.phone || '',
      socialPlatforms: req.body.socialPlatforms || [],
      socialMediaHandle: req.body.socialMediaHandle
    };

    // Try to use Google Sheets if configured
    if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      const success = await appendToGoogleSheets(formData);
      if (success) {
        console.log('✅ Data successfully added to Google Sheets');
      } else {
        console.log('❌ Failed to add data to Google Sheets');
      }
    } else {
      console.log('⚠️ Google Sheets not configured - form data logged only');
    }

    res.json({
      success: true,
      message: 'Form submitted successfully'
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.json({
      success: true,
      message: 'Form submitted successfully'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📋 Form endpoint: http://localhost:${PORT}/api/submit-form`);
  console.log(`🔧 Google Sheets configured: ${!!(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY)}`);
});