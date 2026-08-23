<?php
/**
 * Plugin Name: Nodera — AI-native WordPress Builder
 * Description: AI-native professional authoring for the native WordPress block editor.
 * Version: 0.1.0-alpha.1
 * Requires at least: 7.0
 * Requires PHP: 8.1
 * Text Domain: nodera
 */

defined( 'ABSPATH' ) || exit;

define( 'NODERA_VERSION', '0.1.0-alpha.1' );
define( 'NODERA_FILE', __FILE__ );
define( 'NODERA_DIR', plugin_dir_path( __FILE__ ) );
define( 'NODERA_URL', plugin_dir_url( __FILE__ ) );

$autoload = NODERA_DIR . 'vendor/autoload.php';
if ( file_exists( $autoload ) ) {
	require $autoload;
} else {
	require_once NODERA_DIR . 'includes/Plugin.php';
	require_once NODERA_DIR . 'includes/Gutenberg/StableBlockId.php';
	require_once NODERA_DIR . 'includes/Contracts/BlockContractRegistry.php';
	require_once NODERA_DIR . 'includes/AI/TargetFingerprint.php';
	require_once NODERA_DIR . 'includes/AI/PatchValidator.php';
	require_once NODERA_DIR . 'includes/Rest/AIRestController.php';
}

add_action( 'plugins_loaded', static function (): void {
	if ( version_compare( PHP_VERSION, '8.1', '<' ) || version_compare( get_bloginfo( 'version' ), '7.0', '<' ) ) {
		return;
	}
	\Nodera\Plugin::instance()->boot();
} );
