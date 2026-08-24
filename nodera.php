<?php
/**
 * Plugin Name: Nodera — AI-native WordPress Builder
 * Description: AI-native professional authoring for the native WordPress block editor.
 * Version: 0.1.0-rc.4
 * Requires at least: 7.1
 * Requires PHP: 8.1
 * Text Domain: nodera
 *
 * @package Nodera
 */

defined( 'ABSPATH' ) || exit;

define( 'NODERA_VERSION', '0.1.0-rc.4' );
define( 'NODERA_RELEASE_STATUS', 'release-candidate' );
define( 'NODERA_MIN_WP', '7.1' );
define( 'NODERA_MIN_PHP', '8.1' );
define( 'NODERA_FILE', __FILE__ );
define( 'NODERA_DIR', plugin_dir_path( __FILE__ ) );
define( 'NODERA_URL', plugin_dir_url( __FILE__ ) );

/**
 * Return blocking runtime issues without loading implementation files first.
 *
 * @return string[]
 */
function nodera_runtime_issues(): array {
	global $wp_version;
	$issues = array();
	if ( version_compare( PHP_VERSION, NODERA_MIN_PHP, '<' ) ) {
		$issues[] = sprintf( 'PHP %s or newer is required.', NODERA_MIN_PHP );
	}
	if ( is_string( $wp_version ) && version_compare( $wp_version, NODERA_MIN_WP, '<' ) ) {
		$issues[] = sprintf( 'WordPress %s or newer is required.', NODERA_MIN_WP );
	}
	foreach ( array( 'build/editor.js', 'build/editor.asset.php', 'build/editor.css', 'build/visual-fidelity.js', 'build/visual-fidelity.css' ) as $asset ) {
		if ( ! file_exists( NODERA_DIR . $asset ) ) {
			$issues[] = 'Required runtime asset is missing: ' . $asset;
		}
	}
	return $issues;
}

function nodera_admin_runtime_notice(): void {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	$issues = nodera_runtime_issues();
	if ( empty( $issues ) ) {
		return;
	}
	echo '<div class="notice notice-error"><p><strong>Nodera could not start.</strong> ' . esc_html( implode( ' ', $issues ) ) . '</p></div>';
}

add_action( 'admin_notices', 'nodera_admin_runtime_notice' );
add_action( 'network_admin_notices', 'nodera_admin_runtime_notice' );

register_activation_hook(
	NODERA_FILE,
	static function (): void {
		$issues = nodera_runtime_issues();
		if ( empty( $issues ) ) {
			return;
		}
		if ( function_exists( 'deactivate_plugins' ) ) {
			deactivate_plugins( plugin_basename( NODERA_FILE ) );
		}
		wp_die( esc_html( implode( ' ', $issues ) ), 'Nodera activation blocked', array( 'back_link' => true ) );
	}
);

if ( version_compare( PHP_VERSION, NODERA_MIN_PHP, '<' ) ) {
	return;
}

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
		'includes/AI/ContextSanitizer.php',
		'includes/AI/PatchValidator.php',
		'includes/AI/ProviderManager.php',
		'includes/Security/RequestThrottle.php',
		'includes/Responsive/BreakpointRegistry.php',
		'includes/Responsive/ResponsiveStyleCompiler.php',
		'includes/Bindings/DynamicBindings.php',
		'includes/Blocks/BlockRegistry.php',
		'includes/Protocols/ProtocolRegistry.php',
		'includes/Protocols/ProtocolController.php',
		'includes/Compatibility/CompatibilityRegistry.php',
		'includes/Migrations/MigrationManager.php',
		'includes/Commercial/EntitlementManager.php',
		'includes/Commercial/UpdateClient.php',
		'includes/Admin/Onboarding.php',
		'includes/Rest/AIRestController.php',
		'includes/Rest/VisualContextController.php',
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
		if ( ! empty( nodera_runtime_issues() ) ) {
			return;
		}
		\Nodera\Plugin::instance()->boot();
	}
);
