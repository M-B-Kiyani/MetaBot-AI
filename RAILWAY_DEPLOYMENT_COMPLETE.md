# Railway Deployment - Complete Setup

## ✅ Generated Secure Keys

The following secure API keys have been generated and added to your configuration:

- **API_KEY**: `mk_prod_1a15402d2c3fd6e043348abf660d6e474498196f6236f40b`
- **PUBLIC_WIDGET_KEY**: `wk_ad06e8526e194703c8886e53a7b15ace9a754ad0`
- **WIDGET_API_KEY**: `wk_c821c280302fe8b4c752820d06b568ab0884def0`

## 📁 Updated Files

1. **env.production** - Updated with generated keys
2. **.env.railway** - Complete environment variables template
3. **railway-setup.sh** - Automated setup script
4. **generate-keys.js** - Key generation utility

## 🚀 Deployment Steps

### Option 1: Automated Setup (Recommended)

1. Make sure you have Railway CLI installed:

   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:

   ```bash
   railway login
   ```

3. Initialize your project (if not already done):

   ```bash
   railway init
   ```

4. Run the automated setup script:

   ```bash
   bash railway-setup.sh
   ```

5. Deploy:
   ```bash
   railway up
   ```

### Option 2: Manual Setup

If you prefer to set variables manually, you can copy them from `.env.railway` and set them one by one:

```bash
railway variables set NODE_ENV=production
railway variables set API_KEY="mk_prod_1a15402d2c3fd6e043348abf660d6e474498196f6236f40b"
# ... continue with all variables from .env.railway
```

## 🔐 Security Notes

- All API keys are cryptographically secure (generated using Node.js crypto.randomBytes)
- Keys follow a structured format with prefixes for easy identification
- Store these keys securely - they provide access to your production services

## 🔍 Key Formats

- **API_KEY**: `mk_prod_` prefix (metalogics production) + 48 hex characters
- **WIDGET_KEYS**: `wk_` prefix (widget key) + 40 hex characters

## 📋 Environment Variables Summary

Your Railway deployment will have **67 environment variables** configured, including:

### Critical Services

- ✅ Gemini AI API
- ✅ HubSpot CRM
- ✅ Google Calendar & Service Account
- ✅ Retell AI Voice
- ✅ Database (PostgreSQL)
- ✅ Email (SMTP)

### Security & API Keys

- ✅ Generated API keys for authentication
- ✅ Widget keys for embedded components
- ✅ CORS configuration for allowed domains

### Business Configuration

- ✅ Business hours and timezone (Europe/London)
- ✅ Booking limits and advance hours
- ✅ Rate limiting and request timeouts

## 🎯 Next Steps

1. Run the deployment script
2. Verify all services are working via Railway dashboard
3. Test your application endpoints
4. Monitor logs for any issues

## 🆘 Troubleshooting

If you encounter issues:

1. **Check Railway logs**: `railway logs`
2. **Verify environment variables**: Check Railway dashboard
3. **Test individual services**: Use the health check endpoint
4. **Review CORS settings**: Ensure your domains are in ALLOWED_ORIGINS

## 📞 Support

If you need help with the deployment, check:

- Railway documentation: https://docs.railway.app
- Your application's health endpoint: `/health`
- Railway dashboard for real-time logs and metrics
