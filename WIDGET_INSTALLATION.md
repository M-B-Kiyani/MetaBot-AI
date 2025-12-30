# Metalogics AI Widget Installation Guide

## 🚀 Quick Start for Hostinger WordPress

### Method 1: WordPress Plugin (Recommended)

1. **Upload Plugin Files**

   - Download `metalogics-ai-widget-plugin.php` and `wordpress-widget.js`
   - Upload both files to your WordPress plugins directory: `/wp-content/plugins/metalogics-ai-widget/`

2. **Activate Plugin**

   - Go to WordPress Admin → Plugins
   - Find "Metalogics AI Widget" and click "Activate"

3. **Configure Settings**

   - Go to Settings → AI Widget
   - Configure your API settings and appearance
   - Save changes

4. **Test Widget**
   - Visit your website
   - Look for the chat button in the bottom-right corner
   - Click to test the AI assistant

### Method 2: Simple Script Embed

Add this code to your WordPress theme's `footer.php` or use a plugin like "Insert Headers and Footers":

```html
<script
  src="https://your-domain.com/embed.js"
  data-api-url="https://metabot-ai-production.up.railway.app"
  data-api-key="wk_ad06e8526e194703c8886e53a7b15ace9a754ad0"
  data-company-name="Your Company"
  data-welcome-message="Hello! How can I help you today?"
></script>
```

### Method 3: Direct JavaScript Integration

Add this to your theme's `functions.php`:

```php
function add_metalogics_widget() {
    wp_enqueue_script(
        'metalogics-widget',
        get_template_directory_uri() . '/js/wordpress-widget.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'add_metalogics_widget');
```

## 🔧 Configuration Options

### Available Data Attributes (for embed script):

- `data-api-url`: Your API endpoint URL
- `data-api-key`: Your API authentication key
- `data-company-name`: Company name displayed in widget
- `data-company-logo`: Single character or emoji for logo
- `data-welcome-message`: Initial greeting message
- `data-position`: Widget position (`bottom-right` or `bottom-left`)
- `data-theme`: Widget theme (`metalogics` or `default`)
- `data-auto-open`: Auto-open widget on page load (`true` or `false`)

### Example with All Options:

```html
<script
  src="https://your-domain.com/embed.js"
  data-api-url="https://metabot-ai-production.up.railway.app"
  data-api-key="your-api-key"
  data-company-name="Metalogics.io"
  data-company-logo="M"
  data-welcome-message="Hello! I'm here to help with your questions about our services."
  data-position="bottom-right"
  data-theme="metalogics"
  data-auto-open="false"
></script>
```

## 📱 Features

- **Responsive Design**: Works perfectly on desktop and mobile
- **WordPress Optimized**: Compatible with all WordPress themes
- **Hostinger Ready**: Optimized for Hostinger hosting performance
- **Accessibility**: Full keyboard navigation and screen reader support
- **Customizable**: Easy to customize colors, position, and messages
- **API Integration**: Connects to your Metalogics AI backend
- **Conversation Memory**: Maintains conversation context
- **Typing Indicators**: Shows when AI is responding
- **Error Handling**: Graceful fallbacks for network issues

## 🎨 Customization

### Custom CSS (Optional)

Add this to your theme's CSS to customize appearance:

```css
/* Custom widget button color */
.metalogics-chat-button {
  background: linear-gradient(
    135deg,
    #your-color1 0%,
    #your-color2 100%
  ) !important;
}

/* Custom header color */
.metalogics-chat-header {
  background: linear-gradient(
    135deg,
    #your-color1 0%,
    #your-color2 100%
  ) !important;
}

/* Hide on specific pages */
.page-id-123 #metalogics-widget-container {
  display: none !important;
}
```

## 🔍 Troubleshooting

### Widget Not Appearing

1. Check browser console for JavaScript errors
2. Verify API URL and key are correct
3. Ensure scripts are loading properly
4. Check if widget is enabled in plugin settings

### API Connection Issues

1. Verify your API endpoint is accessible
2. Check API key is valid
3. Ensure CORS is configured properly on your server
4. Test API directly with tools like Postman

### Mobile Issues

1. Check if "Show on Mobile" is enabled
2. Test on actual mobile devices, not just browser resize
3. Verify viewport meta tag is present in your theme

## 📞 Support

For technical support or customization requests:

- Website: [https://metalogics.io](https://metalogics.io)
- Email: support@metalogics.io

## 🔄 Updates

To update the widget:

1. Replace the JavaScript files with new versions
2. Clear any caching plugins
3. Test functionality after update

---

**Version**: 1.0.0  
**Compatible with**: WordPress 5.0+, PHP 7.4+  
**Tested on**: Hostinger, cPanel, and major hosting providers
