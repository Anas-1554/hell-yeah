# Deployment Guide - Google Sheets Integration

This guide covers deploying the form application with Google Sheets integration to various platforms.

## Overview

The application uses serverless functions to handle form submissions and integrate with Google Sheets. The integration requires specific environment variables to be configured in your deployment environment.

## Supported Platforms

- [Vercel](#vercel-deployment) (Recommended)
- [Netlify](#netlify-deployment)
- [AWS Lambda](#aws-lambda-deployment)
- [Google Cloud Functions](#google-cloud-functions-deployment)
- [Docker](#docker-deployment)

## Prerequisites

Before deploying, ensure you have:

1. Completed the [Google Sheets Setup Guide](./google-sheets-setup.md)
2. Your service account JSON key file
3. The spreadsheet ID and sheet name
4. Access to your chosen deployment platform

## Environment Variables

All deployment platforms require these environment variables:

```bash
# Required - Google Sheets API Configuration
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project-id.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id"
GOOGLE_SHEETS_SHEET_NAME="Sheet1"

# Optional - Application Configuration
NODE_ENV="production"
```

### Important Notes

- **Private Key Format**: Must include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- **Newlines**: Preserve `\n` characters in the private key
- **Security**: Never commit these values to version control
- **Encoding**: Some platforms may require base64 encoding for multiline values

## Vercel Deployment

Vercel is the recommended platform as the application is built with Next.js.

### Method 1: Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy the application**:
   ```bash
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add GOOGLE_SHEETS_PRIVATE_KEY
   vercel env add GOOGLE_SHEETS_CLIENT_EMAIL
   vercel env add GOOGLE_SHEETS_SPREADSHEET_ID
   vercel env add GOOGLE_SHEETS_SHEET_NAME
   ```

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Connect Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Environment Variables**:
   - In the project settings, go to "Environment Variables"
   - Add each required environment variable
   - Set the environment to "Production" (and "Preview" if needed)

3. **Deploy**:
   - Vercel will automatically deploy when you push to your main branch
   - Or trigger a manual deployment from the dashboard

### Vercel Configuration

Create a `vercel.json` file in your project root:

```json
{
  "functions": {
    "pages/api/submit-form.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Netlify Deployment

### Method 1: Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize the site**:
   ```bash
   netlify init
   ```

4. **Set environment variables**:
   ```bash
   netlify env:set GOOGLE_SHEETS_PRIVATE_KEY "your-private-key"
   netlify env:set GOOGLE_SHEETS_CLIENT_EMAIL "your-client-email"
   netlify env:set GOOGLE_SHEETS_SPREADSHEET_ID "your-spreadsheet-id"
   netlify env:set GOOGLE_SHEETS_SHEET_NAME "Sheet1"
   ```

5. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

### Method 2: Netlify Dashboard

1. **Connect Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "New site from Git"
   - Connect your repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**:
   - Go to Site settings > Environment variables
   - Add each required environment variable

### Netlify Configuration

Create a `netlify.toml` file:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_ENV = "production"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  directory = "netlify/functions"
```

You'll also need to adapt the API route for Netlify Functions format.

## AWS Lambda Deployment

### Using Serverless Framework

1. **Install Serverless Framework**:
   ```bash
   npm install -g serverless
   ```

2. **Create `serverless.yml`**:
   ```yaml
   service: form-submissions
   
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     environment:
       GOOGLE_SHEETS_PRIVATE_KEY: ${env:GOOGLE_SHEETS_PRIVATE_KEY}
       GOOGLE_SHEETS_CLIENT_EMAIL: ${env:GOOGLE_SHEETS_CLIENT_EMAIL}
       GOOGLE_SHEETS_SPREADSHEET_ID: ${env:GOOGLE_SHEETS_SPREADSHEET_ID}
       GOOGLE_SHEETS_SHEET_NAME: ${env:GOOGLE_SHEETS_SHEET_NAME}
   
   functions:
     submitForm:
       handler: pages/api/submit-form.handler
       events:
         - http:
             path: api/submit-form
             method: post
             cors: true
   ```

3. **Deploy**:
   ```bash
   serverless deploy
   ```

### Using AWS CDK

Create a CDK stack to deploy the Lambda function with proper environment variables and API Gateway integration.

## Google Cloud Functions Deployment

1. **Install Google Cloud SDK**:
   ```bash
   # Follow installation instructions for your OS
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Deploy Function**:
   ```bash
   gcloud functions deploy submitForm \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --set-env-vars GOOGLE_SHEETS_PRIVATE_KEY="your-private-key",GOOGLE_SHEETS_CLIENT_EMAIL="your-client-email",GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id",GOOGLE_SHEETS_SHEET_NAME="Sheet1"
   ```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GOOGLE_SHEETS_PRIVATE_KEY=${GOOGLE_SHEETS_PRIVATE_KEY}
      - GOOGLE_SHEETS_CLIENT_EMAIL=${GOOGLE_SHEETS_CLIENT_EMAIL}
      - GOOGLE_SHEETS_SPREADSHEET_ID=${GOOGLE_SHEETS_SPREADSHEET_ID}
      - GOOGLE_SHEETS_SHEET_NAME=${GOOGLE_SHEETS_SHEET_NAME}
    env_file:
      - .env.production
```

### Deploy to Container Registry

```bash
# Build and tag
docker build -t your-registry/form-app:latest .

# Push to registry
docker push your-registry/form-app:latest

# Deploy to your container platform
```

## Environment Variable Management

### Security Best Practices

1. **Never commit secrets to version control**
2. **Use platform-specific secret management**:
   - Vercel: Environment Variables in dashboard
   - AWS: Systems Manager Parameter Store or Secrets Manager
   - Google Cloud: Secret Manager
   - Azure: Key Vault

3. **Rotate credentials regularly**
4. **Use different service accounts for different environments**

### Environment-Specific Configuration

#### Development
```bash
# .env.local (not committed)
GOOGLE_SHEETS_PRIVATE_KEY="dev-private-key"
GOOGLE_SHEETS_CLIENT_EMAIL="dev-service@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="dev-spreadsheet-id"
GOOGLE_SHEETS_SHEET_NAME="DevSheet"
```

#### Staging
```bash
# Set in deployment platform
GOOGLE_SHEETS_PRIVATE_KEY="staging-private-key"
GOOGLE_SHEETS_CLIENT_EMAIL="staging-service@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="staging-spreadsheet-id"
GOOGLE_SHEETS_SHEET_NAME="StagingSheet"
```

#### Production
```bash
# Set in deployment platform
GOOGLE_SHEETS_PRIVATE_KEY="prod-private-key"
GOOGLE_SHEETS_CLIENT_EMAIL="prod-service@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="prod-spreadsheet-id"
GOOGLE_SHEETS_SHEET_NAME="Sheet1"
```

## Testing Deployment

### Pre-deployment Checklist

- [ ] All environment variables are set
- [ ] Google Sheets API is enabled
- [ ] Service account has access to spreadsheet
- [ ] Build process completes successfully
- [ ] Integration tests pass

### Post-deployment Verification

1. **Test API Endpoint**:
   ```bash
   curl -X POST https://your-domain.com/api/submit-form \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "contactMethods": ["email"],
       "email": "test@example.com",
       "socialPlatforms": ["instagram"],
       "socialMediaHandle": "@testuser"
     }'
   ```

2. **Check Google Sheets**:
   - Verify new row appears in spreadsheet
   - Confirm data formatting is correct

3. **Monitor Logs**:
   - Check platform logs for errors
   - Verify successful submissions are logged

4. **Test Error Scenarios**:
   - Submit invalid data
   - Verify graceful error handling

## Monitoring and Maintenance

### Logging

Set up logging and monitoring:

- **Vercel**: Built-in function logs
- **AWS**: CloudWatch Logs
- **Google Cloud**: Cloud Logging
- **Netlify**: Function logs

### Alerts

Configure alerts for:
- API endpoint failures
- Google Sheets API errors
- High error rates
- Performance degradation

### Maintenance Tasks

1. **Regular Updates**:
   - Update dependencies
   - Rotate service account keys
   - Review and update environment variables

2. **Performance Monitoring**:
   - Monitor API response times
   - Track Google Sheets API usage
   - Monitor error rates

3. **Security Audits**:
   - Review service account permissions
   - Audit access logs
   - Update security configurations

## Troubleshooting

### Common Deployment Issues

#### Environment Variables Not Loading
- Verify variable names match exactly
- Check for typos in variable values
- Ensure variables are set for correct environment

#### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review build logs for specific errors

#### API Endpoint Not Working
- Verify serverless function configuration
- Check API route paths
- Test locally before deploying

#### Google Sheets Integration Failing
- Verify service account permissions
- Check spreadsheet sharing settings
- Test API credentials manually

### Debug Commands

```bash
# Check environment variables (be careful with secrets)
vercel env ls
netlify env:list

# View function logs
vercel logs
netlify functions:log

# Test API endpoint
curl -X POST https://your-domain.com/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Rollback Procedures

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Netlify
```bash
# List deployments
netlify api listSiteDeploys --site-id=your-site-id

# Rollback via dashboard or API
```

### AWS Lambda
```bash
# Update function to previous version
aws lambda update-function-code --function-name submitForm --s3-bucket your-bucket --s3-key previous-version.zip
```

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)