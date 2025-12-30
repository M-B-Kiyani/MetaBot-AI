<?php
/**
 * Plugin Name: Metalogics AI Widget
 * Plugin URI: https://metalogics.io
 * Description: AI-powered chat widget for customer support and lead generation. Optimized for Hostinger hosting.
 * Version: 1.0.0
 * Author: Metalogics.io
 * License: GPL v2 or later
 * Text Domain: metalogics-ai-widget
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('METALOGICS_WIDGET_VERSION', '1.0.0');
define('METALOGICS_WIDGET_PLUGIN_URL', plugin_dir_url(__FILE__));
define('METALOGICS_WIDGET_PLUGIN_PATH', plugin_dir_path(__FILE__));

class MetalogicsAIWidget {
    
    private $options;
    
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        // Admin hooks
        if (is_admin()) {
            add_action('admin_menu', array($this, 'add_admin_menu'));
            add_action('admin_init', array($this, 'admin_init'));
        }
        
        // Frontend hooks
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_footer', array($this, 'render_widget'));
        
        // Get options
        $this->options = get_option('metalogics_widget_options', $this->get_default_options());
    }
    
    private function get_default_options() {
        return array(
            'api_url' => 'https://metabot-ai-production.up.railway.app',
            'api_key' => 'wk_ad06e8526e194703c8886e53a7b15ace9a754ad0',
            'company_name' => 'Metalogics.io',
            'company_logo' => 'M',
            'welcome_message' => 'Hello! I\'m the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?',
            'position' => 'bottom-right',
            'theme' => 'metalogics',
            'auto_open' => false,
            'enabled' => true,
            'show_on_pages' => array(),
            'hide_on_pages' => array(),
            'show_on_mobile' => true
        );
    }
    
    public function enqueue_scripts() {
        if (!$this->should_show_widget()) {
            return;
        }
        
        // Enqueue the widget script
        wp_enqueue_script(
            'metalogics-ai-widget',
            METALOGICS_WIDGET_PLUGIN_URL . 'wordpress-widget.js',
            array(),
            METALOGICS_WIDGET_VERSION,
            true
        );
        
        // Pass configuration to JavaScript
        wp_localize_script('metalogics-ai-widget', 'metalogicsWidgetConfig', array(
            'apiUrl' => $this->options['api_url'],
            'apiKey' => $this->options['api_key'],
            'companyName' => $this->options['company_name'],
            'companyLogo' => $this->options['company_logo'],
            'welcomeMessage' => $this->options['welcome_message'],
            'position' => $this->options['position'],
            'theme' => $this->options['theme'],
            'autoOpen' => $this->options['auto_open']
        ));
    }
    
    public function render_widget() {
        if (!$this->should_show_widget()) {
            return;
        }
        
        // Widget will be rendered by JavaScript
        echo '<!-- Metalogics AI Widget will be inserted here by JavaScript -->';
    }
    
    private function should_show_widget() {
        if (!$this->options['enabled']) {
            return false;
        }
        
        // Check mobile setting
        if (!$this->options['show_on_mobile'] && wp_is_mobile()) {
            return false;
        }
        
        $current_page_id = get_the_ID();
        
        // Check if widget should be hidden on specific pages
        if (!empty($this->options['hide_on_pages']) && in_array($current_page_id, $this->options['hide_on_pages'])) {
            return false;
        }
        
        // Check if widget should only show on specific pages
        if (!empty($this->options['show_on_pages']) && !in_array($current_page_id, $this->options['show_on_pages'])) {
            return false;
        }
        
        return true;
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Metalogics AI Widget Settings',
            'AI Widget',
            'manage_options',
            'metalogics-ai-widget',
            array($this, 'admin_page')
        );
    }
    
    public function admin_init() {
        register_setting(
            'metalogics_widget_settings',
            'metalogics_widget_options',
            array($this, 'sanitize_options')
        );
        
        add_settings_section(
            'metalogics_widget_main',
            'Main Settings',
            array($this, 'main_section_callback'),
            'metalogics-ai-widget'
        );
        
        // API Settings
        add_settings_field(
            'api_url',
            'API URL',
            array($this, 'api_url_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        add_settings_field(
            'api_key',
            'API Key',
            array($this, 'api_key_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        // Appearance Settings
        add_settings_field(
            'company_name',
            'Company Name',
            array($this, 'company_name_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        add_settings_field(
            'company_logo',
            'Company Logo (Single Character)',
            array($this, 'company_logo_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        add_settings_field(
            'welcome_message',
            'Welcome Message',
            array($this, 'welcome_message_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        add_settings_field(
            'position',
            'Widget Position',
            array($this, 'position_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        add_settings_field(
            'enabled',
            'Enable Widget',
            array($this, 'enabled_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
        
        add_settings_field(
            'show_on_mobile',
            'Show on Mobile',
            array($this, 'show_on_mobile_callback'),
            'metalogics-ai-widget',
            'metalogics_widget_main'
        );
    }
    
    public function sanitize_options($input) {
        $sanitized = array();
        
        $sanitized['api_url'] = esc_url_raw($input['api_url']);
        $sanitized['api_key'] = sanitize_text_field($input['api_key']);
        $sanitized['company_name'] = sanitize_text_field($input['company_name']);
        $sanitized['company_logo'] = sanitize_text_field(substr($input['company_logo'], 0, 1));
        $sanitized['welcome_message'] = sanitize_textarea_field($input['welcome_message']);
        $sanitized['position'] = sanitize_text_field($input['position']);
        $sanitized['theme'] = sanitize_text_field($input['theme']);
        $sanitized['enabled'] = isset($input['enabled']) ? true : false;
        $sanitized['auto_open'] = isset($input['auto_open']) ? true : false;
        $sanitized['show_on_mobile'] = isset($input['show_on_mobile']) ? true : false;
        
        return $sanitized;
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Metalogics AI Widget Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('metalogics_widget_settings');
                do_settings_sections('metalogics-ai-widget');
                submit_button();
                ?>
            </form>
            
            <div class="card" style="margin-top: 20px;">
                <h2>Widget Preview</h2>
                <p>The AI widget will appear in the bottom-right corner of your website when enabled.</p>
                <p><strong>Test the widget:</strong> Visit your website to see the chat button and test the functionality.</p>
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <h2>Support</h2>
                <p>For support and customization, contact <a href="https://metalogics.io" target="_blank">Metalogics.io</a></p>
            </div>
        </div>
        <?php
    }
    
    public function main_section_callback() {
        echo '<p>Configure your AI widget settings below:</p>';
    }
    
    public function api_url_callback() {
        printf(
            '<input type="url" id="api_url" name="metalogics_widget_options[api_url]" value="%s" class="regular-text" required />',
            isset($this->options['api_url']) ? esc_attr($this->options['api_url']) : ''
        );
        echo '<p class="description">Your Metalogics AI API endpoint URL</p>';
    }
    
    public function api_key_callback() {
        printf(
            '<input type="text" id="api_key" name="metalogics_widget_options[api_key]" value="%s" class="regular-text" required />',
            isset($this->options['api_key']) ? esc_attr($this->options['api_key']) : ''
        );
        echo '<p class="description">Your API key for authentication</p>';
    }
    
    public function company_name_callback() {
        printf(
            '<input type="text" id="company_name" name="metalogics_widget_options[company_name]" value="%s" class="regular-text" />',
            isset($this->options['company_name']) ? esc_attr($this->options['company_name']) : ''
        );
    }
    
    public function company_logo_callback() {
        printf(
            '<input type="text" id="company_logo" name="metalogics_widget_options[company_logo]" value="%s" maxlength="1" style="width: 50px;" />',
            isset($this->options['company_logo']) ? esc_attr($this->options['company_logo']) : ''
        );
        echo '<p class="description">Single character or emoji to display as logo</p>';
    }
    
    public function welcome_message_callback() {
        printf(
            '<textarea id="welcome_message" name="metalogics_widget_options[welcome_message]" rows="3" class="large-text">%s</textarea>',
            isset($this->options['welcome_message']) ? esc_textarea($this->options['welcome_message']) : ''
        );
    }
    
    public function position_callback() {
        $positions = array(
            'bottom-right' => 'Bottom Right',
            'bottom-left' => 'Bottom Left'
        );
        
        echo '<select id="position" name="metalogics_widget_options[position]">';
        foreach ($positions as $value => $label) {
            $selected = (isset($this->options['position']) && $this->options['position'] == $value) ? 'selected' : '';
            echo "<option value='$value' $selected>$label</option>";
        }
        echo '</select>';
    }
    
    public function enabled_callback() {
        $checked = isset($this->options['enabled']) && $this->options['enabled'] ? 'checked' : '';
        echo "<input type='checkbox' id='enabled' name='metalogics_widget_options[enabled]' value='1' $checked />";
        echo '<label for="enabled">Enable the AI widget on your website</label>';
    }
    
    public function show_on_mobile_callback() {
        $checked = isset($this->options['show_on_mobile']) && $this->options['show_on_mobile'] ? 'checked' : '';
        echo "<input type='checkbox' id='show_on_mobile' name='metalogics_widget_options[show_on_mobile]' value='1' $checked />";
        echo '<label for="show_on_mobile">Show widget on mobile devices</label>';
    }
}

// Initialize the plugin
new MetalogicsAIWidget();

// Activation hook
register_activation_hook(__FILE__, 'metalogics_widget_activate');
function metalogics_widget_activate() {
    // Set default options
    $default_options = array(
        'api_url' => 'https://metabot-ai-production.up.railway.app',
        'api_key' => 'wk_ad06e8526e194703c8886e53a7b15ace9a754ad0',
        'company_name' => 'Metalogics.io',
        'company_logo' => 'M',
        'welcome_message' => 'Hello! I\'m the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?',
        'position' => 'bottom-right',
        'theme' => 'metalogics',
        'auto_open' => false,
        'enabled' => true,
        'show_on_mobile' => true
    );
    
    add_option('metalogics_widget_options', $default_options);
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'metalogics_widget_deactivate');
function metalogics_widget_deactivate() {
    // Clean up if needed
}
?>