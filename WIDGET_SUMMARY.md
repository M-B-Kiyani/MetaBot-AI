# 🤖 Metalogics AI Widget - Complete Package

## 📦 What's Included

Your complete WordPress widget package includes:

### Core Files

- **`wordpress-widget.js`** - Main widget JavaScript (production-ready)
- **`embed.js`** - Simple embed script for any website
- **`metalogics-ai-widget-plugin.php`** - Complete WordPress plugin
- **`widget-demo.html`** - Live demo page
- **`deploy-widget.js`** - Deployment script

### Documentation

- **`WIDGET_INSTALLATION.md`** - Complete installation guide
- **`WIDGET_SUMMARY.md`** - This summary file

### Public Files (Auto-deployed)

- **`public/wordpress-widget.js`** - Widget script for serving
- **`public/embed.js`** - Embed script for serving
- **`public/widget-demo.html`** - Demo page
- **`public/index.html`** - File listing page

## 🚀 Quick Start for Hostinger WordPress

### Option 1: WordPress Plugin (Recommended)

1. Create folder: `/wp-content/plugins/metalogics-ai-widget/`
2. Upload: `metalogics-ai-widget-plugin.php` and `wordpress-widget.js`
3. Activate plugin in WordPress admin
4. Configure in Settings → AI Widget

### Option 2: Simple Script Embed

Add to your theme's footer or use "Insert Headers and Footers" plugin:

```html
<script
  src="https://metabot-ai-production.up.railway.app/embed.js"
  data-api-url="https://metabot-ai-production.up.railway.app"
  data-api-key="wk_ad06e8526e194703c8886e53a7b15ace9a754ad0"
  data-company-name="Your Company Name"
  data-welcome-message="Hello! How can I help you today?"
></script>
```

## ✨ Features

### 🎨 Design & UX

- Modern, responsive design
- Smooth animations and transitions
- Mobile-optimized interface
- Accessibility compliant (WCAG 2.1)
- WordPress theme compatibility
- High contrast and reduced motion support

### 🔧 Technical Features

- **API Integration**: Connects to your Railway-hosted backend
- **Conversation Memory**: Maintains context across messages
- **Error Handling**: Graceful fallbacks for network issues
- **Performance Optimized**: Minimal load impact
- **Security**: Input sanitization and XSS protection
- **SEO Friendly**: No impact on page SEO

### 📱 Responsive Features

- **Desktop**: Full-featured chat interface
- **Mobile**: Optimized for touch interaction
- **Tablet**: Adaptive layout for all screen sizes

### 🎛️ Customization Options

- Company name and logo
- Welcome message
- Widget position (bottom-right/left)
- Color themes
- Auto-open behavior
- Page-specific visibility

## 🔗 Integration URLs

Your widget is now available at these URLs:

- **Demo Page**: `https://metabot-ai-production.up.railway.app/public/widget-demo.html`
- **Embed Script**: `https://metabot-ai-production.up.railway.app/public/embed.js`
- **Widget Script**: `https://metabot-ai-production.up.railway.app/public/wordpress-widget.js`
- **File Listing**: `https://metabot-ai-production.up.railway.app/public/`

## 🛠️ Configuration

### WordPress Plugin Settings

Access via **Settings → AI Widget**:

- API URL and Key
- Company branding
- Welcome message
- Position and behavior
- Page visibility rules
- Mobile settings

### Embed Script Attributes

```html
data-api-url="your-api-endpoint" data-api-key="your-api-key"
data-company-name="Your Company" data-company-logo="Y"
data-welcome-message="Custom greeting" data-position="bottom-right"
data-theme="metalogics" data-auto-open="false"
```

## 🎯 Use Cases

### Customer Support

- Answer common questions
- Provide service information
- Handle basic troubleshooting
- Escalate complex issues

### Lead Generation

- Qualify potential customers
- Collect contact information
- Schedule consultations
- Provide service quotes

### Sales Assistance

- Product recommendations
- Pricing information
- Feature comparisons
- Purchase guidance

## 📊 Analytics & Monitoring

The widget automatically tracks:

- Conversation starts
- Message volume
- User engagement
- Error rates
- Performance metrics

## 🔒 Security Features

- **Input Sanitization**: All user inputs are cleaned
- **XSS Protection**: Prevents script injection
- **CORS Configuration**: Secure cross-origin requests
- **API Authentication**: Secure key-based access
- **Rate Limiting**: Prevents abuse

## 🌐 Browser Support

- **Chrome**: 70+
- **Firefox**: 65+
- **Safari**: 12+
- **Edge**: 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 70+

## 📞 Support & Customization

For additional features or customization:

- **Website**: https://metalogics.io
- **Email**: support@metalogics.io
- **Custom Development**: Available for advanced features

## 🔄 Updates

To update the widget:

1. Replace JavaScript files with new versions
2. Clear WordPress/hosting cache
3. Test functionality
4. Update plugin version if using WordPress plugin

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: December 30, 2024  
**Compatibility**: WordPress 5.0+, Modern Browsers
