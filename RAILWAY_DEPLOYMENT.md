# Railway Deployment Guide

## Prerequisites

1. Create a Railway account at https://railway.app
2. Install Railway CLI: `npm install -g @railway/cli`
3. Have all required API keys ready (Gemini, HubSpot, Google, Retell)

## Deployment Steps

### 1. Create Railway Project

```bash
railway login
railway init
```

### 2. Set Environment Variables

Copy the variables from `.env.railway` and set them in your Railway project:

```bash
railway variables set NODE_ENV=production
railway variables set GEMINI_API_KEY=your_actual_key
railway variables set HUBSPOT_API_KEY=your_actual_key
# ... set all other required variables
```

Or use the Railway dashboard to set environment variables.

### 3. Deploy

```bash
railway up
```

## Required Environment Variables

The following environment variables MUST be set in Railway:

### Critical (Application won't start without these):

- `GEMINI_API_KEY` - Your Google Gemini API key
- `HUBSPOT_API_KEY` - Your HubSpot API key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google service account email
- `GOOGLE_PRIVATE_KEY` - Google service account private key (base64 encoded)
- `GOOGLE_CALENDAR_ID` - Target Google Calendar ID
- `RETELL_API_KEY` - Retell AI API key
- `RETELL_WEBHOOK_SECRET` - Retell webhook secret

### Important (Recommended for production):

- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)
- `WIDGET_ALLOWED_DOMAINS` - Domains allowed to embed widget
- `API_KEYS` - API keys for widget authentication
- `LOG_LEVEL` - Set to 'warn' or 'error' for production

### Optional (Have defaults):

- `PORT` - Railway sets this automatically
- `NODE_ENV` - Set to 'production'
- `TIMEZONE` - Defaults to 'America/New_York'

## Health Check

Railway will use the `/health` endpoint to monitor application health.
The application includes comprehensive health checks for all external services.

## Monitoring

- Logs are available in Railway dashboard
- Health checks run every 30 seconds
- Application will restart automatically on failure (max 10 retries)

## Domain Configuration

1. In Railway dashboard, go to your service settings
2. Add your custom domain
3. Update `CORS_ORIGINS` and `WIDGET_ALLOWED_DOMAINS` to include your domain
4. Update any hardcoded URLs in your frontend widget

## Troubleshooting

### Common Issues:

1. **Application won't start**: Check that all required environment variables are set
2. **Health check failing**: Verify external API keys are correct
3. **CORS errors**: Ensure your domain is in `CORS_ORIGINS`
4. **Widget not loading**: Check `WIDGET_ALLOWED_DOMAINS` includes your domain

### Debugging:

```bash
railway logs
railway shell
```

## Security Notes

- Never commit API keys to version control
- Use Railway's environment variable encryption
- Regularly rotate API keys
- Monitor logs for security issues
- Keep dependencies updated
