<?php
/**
 * Plugin Name: Nodera — AI-native WordPress Builder
 * Description: AI-native professional authoring for the native WordPress block editor.
 * Version: 0.1.0-alpha.4
 * Requires at least: 7.0
 * Requires PHP: 8.1
 * Text Domain: nodera
 *
 * @package Nodera
 */

defined( 'ABSPATH' ) || exit;

define( 'NODERA_VERSION', '0.1.0-alpha.4' );
define( 'NODERA_FILE', __FILE__ );
define( 'NODERA_DIR', plugin_dir_path( __FILE__ ) );
define( 'NODERA_URL', plugin_dir_url( __FILE__ ) );

$autoload = NODERA_DIR . 'vendor/autoload.php';
if ( file_exists( $autoload ) ) {
	require $autoload;
} else {
	$files = array(
		'includes/Gutenberg/StableBlockId.php',
		'includes/Contracts/BlockContractRegistry.php',
		'includes/AI/TargetFingerprint.php',
		'includes/AI/CandidateTree.php',
		'includes/AI/DiffEngine.php',
		'includes/AI/DesignQualityGate.php',
		'includes/AI/PatchValidator.php',
		'includes/Responsive/BreakpointRegistry.php',
		'includes/Responsive/ResponsiveStyleCompiler.php',
		'includes/Bindings/DynamicBindings.php',
		'includes/Blocks/BlockRegistry.php',
		'includes/Rest/AIRestController.php',
		'includes/Rest/DiagnosticsController.php',
		'includes/Plugin.php',
	);
	foreach ( $files as $file ) {
		require_once NODERA_DIR . $file;
	}
}

add_action(
	'plugins_loaded',
	static function (): void {
		if ( version_compare( PHP_VERSION, '8.1', '<' ) || version_compare( get_bloginfo( 'version' ), '7.0', '<' ) ) {
			return;
		}
		\Nodera\Plugin::instance()->boot();
	}
);
