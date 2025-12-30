/**
 * Metalogics AI Widget for WordPress - Template Version
 * Copy this file to wordpress-widget.js and replace placeholders
 */

(function() {
    'use strict';

    // Configuration - REPLACE THESE VALUES
    const WIDGET_CONFIG = Object.assign({
        apiUrl: "{{API_URL}}", // Replace with your API URL
        apiKey: "{{API_KEY}}", // Replace with your API key
        theme: "metalogics",
        position: "bottom-right",
        autoOpen: false,
        welcomeMessage: "{{WELCOME_MESSAGE}}", // Replace with your message
        companyName: "{{COMPANY_NAME}}", // Replace with your company name
        companyLogo: "{{COMPANY_LOGO}}" // Replace with your logo
    }, 
    window.METALOGICS_WIDGET_CONFIG || {},
    window.metalogicsWidgetConfig || {});

    // Rest of the widget code remains the same...
    // (Include the full widget implementation here)