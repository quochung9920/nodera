<?php
/**
 * Nodera uninstall cleanup.
 *
 * @package Nodera
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Remove provider configuration, including any API key stored in WordPress options.
delete_option( 'nodera_ai_provider' );
delete_site_option( 'nodera_ai_provider' );
