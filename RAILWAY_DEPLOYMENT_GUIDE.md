# Railway Deployment Guide for AI Booking Voice Assistant

This guide will walk you through deploying the AI Booking Voice Assistant system to Railway, including all three applications: backend API, frontend, and embeddable widget.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: Prepare all required environment variables (see below)

## Architecture Overview

The system consists of three main components:

- **Backend API** (`apps/backend`): Express.js server with PostgreSQL database
- **Frontend App** (`apps/frontend`): React application for the main interface
- **Widget** (`apps/widget`): Embeddable widget for third-party websites

## Step 1: Database Setup

### 1.1 Create PostgreSQL Database

1. In Railway dashboard, click "New Project"
2. Select "Provision PostgreSQL"
3. Note the connection details from the "Connect" tab
4. Copy the `DATABASE_URL` for later use

### 1.2 Database Configuration

The `DATABASE_URL` should be in this format:

```
postgresql://username:password@host:port/database
```

## Step 2: Backend API Deployment

### 2.1 Create Backend Service

1. In your Railway project, click "New Service"
2. Select "GitHub Repo" and connect your repository
3. Choose the root directory (Railway will detect the monorepo structure)
4. Set the service name to "ai-booking-backend"

### 2.2 Configure Build Settings

In the service settings:

**Build Command:**

```bash
cd apps/backend && npm install && npm run build
```

**Start Command:**

```bash
cd apps/backend && npm start
```

**Root Directory:** `/` (Railway will handle the monorepo)

### 2.3 Environment Variables

Add these environment variables in Railway dashboard:

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Server
NODE_ENV=production
PORT=3000

# Google Calendar (Required for booking sync)
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com
GOOGLE_CALENDAR_TIMEZONE=Europe/London

# HubSpot CRM (Optional but recommended)
HUBSPOT_ENABLED=true
HUBSPOT_API_KEY=your-hubspot-api-key

# Retell AI Voice (Required for voice features)
RETELL_ENABLED=true
RETELL_API_KEY=your-retell-api-key
RETELL_AGENT_ID=your-retell-agent-id
RETELL_WEBHOOK_SECRET=your-webhook-secret

# Gemini AI (Required for chat)
GEMINI_API_KEY=your-gemini-api-key

# CORS (Update with your frontend domain)
ALLOWED_ORIGINS=https://your-frontend-domain.railway.app,https://your-widget-domain.railway.app
```

#### Optional Variables

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=AI Booking Assistant

# Business Rules
BUSINESS_DAYS=1,2,3,4,5
BUSINESS_START_HOUR=9
BUSINESS_END_HOUR=17
BUSINESS_TIMEZONE=Europe/London

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### 2.4 Custom Nixpacks Configuration

Create `nixpacks.toml` in the root directory:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = [
  "cd apps/backend",
  "npm install",
  "npx prisma generate",
  "npm run build"
]

[start]
cmd = "cd apps/backend && npm start"
```

### 2.5 Deploy Backend

1. Push your code to GitHub
2. Railway will automatically detect changes and deploy
3. Check the deployment logs for any errors
4. Test the API health endpoint: `https://your-backend.railway.app/health`

## Step 3: Frontend Deployment

### 3.1 Create Frontend Service

1. Create a new service in the same Railway project
2. Connect the same GitHub repository
3. Set service name to "ai-booking-frontend"

### 3.2 Configure Frontend Build

**Build Command:**

```bash
cd apps/frontend && npm install && npm run build
```

**Start Command:**

```bash
cd apps/frontend && npm run preview
```

### 3.3 Frontend Environment Variables

```bash
NODE_ENV=production
VITE_API_URL=https://your-backend.railway.app
VITE_RETELL_AGENT_ID=your-retell-agent-id
```

## Step 4: Widget Deployment

### 4.1 Create Widget Service

1. Create another service for the widget
2. Connect the same repository
3. Set service name to "ai-booking-widget"

### 4.2 Configure Widget Build

**Build Command:**

```bash
cd apps/widget && npm install && npm run build
```

**Start Command:**

```bash
cd apps/widget && npm run preview
```

### 4.3 Widget Environment Variables

```bash
NODE_ENV=production
VITE_API_URL=https://your-backend.railway.app
```

## Step 5: Database Migration

### 5.1 Run Initial Migration

After backend deployment, run database migrations:

1. Go to backend service in Railway
2. Open the service terminal
3. Run migration commands:

```bash
cd apps/backend
npx prisma migrate deploy
npx prisma db seed  # If you have seed data
```

### 5.2 Verify Database

Check that tables are created:

```bash
npx prisma studio
```

## Step 6: Configure External Services

### 6.1 Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create a service account
5. Download the service account key JSON
6. Share your calendar with the service account email
7. Copy the JSON content to `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable

### 6.2 HubSpot Setup

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com)
2. Create a private app
3. Grant necessary scopes (contacts, deals)
4. Copy the API key to `HUBSPOT_API_KEY`

### 6.3 Retell AI Setup

1. Sign up at [Retell AI](https://retellai.com)
2. Create an agent
3. Configure the agent with your backend webhook URL: `https://your-backend.railway.app/api/voice/webhook`
4. Copy API key and agent ID to environment variables

### 6.4 Google Gemini Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy to `GEMINI_API_KEY` environment variable

## Step 7: Domain Configuration

### 7.1 Custom Domains (Optional)

1. In Railway service settings, go to "Domains"
2. Add custom domain
3. Update DNS records as instructed
4. Update CORS settings in backend

### 7.2 SSL Certificates

Railway automatically provides SSL certificates for all domains.

## Step 8: Testing Deployment

### 8.1 Backend API Tests

Test these endpoints:

```bash
# Health check
curl https://your-backend.railway.app/health

# Booking creation
curl -X POST https://your-backend.railway.app/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","startTime":"2024-01-01T10:00:00Z","duration":30}'

# Chat endpoint
curl -X POST https://your-backend.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test"}'
```

### 8.2 Frontend Tests

1. Visit your frontend URL
2. Test booking form
3. Test chat interface
4. Test voice features

### 8.3 Widget Tests

1. Visit your widget URL
2. Test embedding on a test page:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Widget Test</title>
  </head>
  <body>
    <h1>Test Page</h1>
    <script
      src="https://your-widget.railway.app/widget.js"
      data-auto-init="true"
      data-api-url="https://your-backend.railway.app"
      data-theme="light"
      data-position="bottom-right"
    ></script>
  </body>
</html>
```

## Step 9: Monitoring and Maintenance

### 9.1 Logging

Railway provides built-in logging. Monitor:

- Application logs
- Database connection logs
- API response times
- Error rates

### 9.2 Scaling

Configure auto-scaling in Railway:

1. Go to service settings
2. Set replica count based on traffic
3. Monitor resource usage

### 9.3 Backup

Set up database backups:

1. Railway provides automatic PostgreSQL backups
2. Consider additional backup strategies for critical data

## Step 10: Widget Integration Guide

### 10.1 Basic Integration

Add to any website:

```html
<script
  src="https://your-widget.railway.app/widget.js"
  data-auto-init="true"
  data-api-url="https://your-backend.railway.app"
></script>
```

### 10.2 Advanced Integration

```html
<div id="custom-widget-container"></div>
<script src="https://your-widget.railway.app/widget.js"></script>
<script>
  window.AIBookingWidget.initWidget('custom-widget-container', {
    apiUrl: 'https://your-backend.railway.app',
    theme: 'dark',
    position: 'bottom-left',
  });
</script>
```

### 10.3 Customization Options

- `theme`: 'light' | 'dark'
- `position`: 'bottom-right' | 'bottom-left'
- `apiUrl`: Your backend API URL

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check database service is running
   - Ensure migrations are applied

2. **CORS Errors**
   - Update ALLOWED_ORIGINS environment variable
   - Include all frontend/widget domains

3. **External API Failures**
   - Verify all API keys are correct
   - Check service account permissions
   - Test webhook URLs are accessible

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- GitHub Issues: Create issues in your repository

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **API Keys**: Rotate keys regularly
3. **CORS**: Restrict to specific domains in production
4. **Rate Limiting**: Configure appropriate limits
5. **Input Validation**: All inputs are validated server-side
6. **Webhook Security**: Verify webhook signatures

## Performance Optimization

1. **Database Indexing**: Ensure proper indexes on frequently queried fields
2. **Caching**: Implement Redis caching for frequently accessed data
3. **CDN**: Use Railway's CDN for static assets
4. **Monitoring**: Set up alerts for performance metrics

This completes the Railway deployment guide. Your AI Booking Voice Assistant should now be fully deployed and operational!
