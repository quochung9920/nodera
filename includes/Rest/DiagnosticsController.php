<?php
/**
 * Non-secret Nodera diagnostics.
 *
 * @package Nodera
 */

namespace Nodera\Rest;

use Nodera\Bindings\DynamicBindings;
use Nodera\Commercial\EntitlementManager;
use Nodera\Commercial\UpdateClient;
use Nodera\Compatibility\CompatibilityRegistry;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Migrations\MigrationManager;
use Nodera\Protocols\ProtocolRegistry;
use Nodera\Responsive\BreakpointRegistry;
use WP_REST_Response;

/**
 * Exposes safe capability diagnostics to editors without leaking credentials/content.
 */
final class DiagnosticsController {
	public function __construct(
		private BlockContractRegistry $contracts,
		private BreakpointRegistry $breakpoints,
		private ProtocolRegistry $protocols,
		private CompatibilityRegistry $compatibility,
		private MigrationManager $migrations,
		private DynamicBindings $bindings,
		private EntitlementManager $entitlement,
		private UpdateClient $updates
	) {}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_route' ) );
	}

	public function register_route(): void {
		register_rest_route(
			'nodera/v1',
			'/diagnostics',
			array(
				'methods'             => 'GET',
				'permission_callback' => static fn(): bool => current_user_can( 'edit_posts' ),
				'callback'            => array( $this, 'get_diagnostics' ),
			)
		);
	}

	public function get_diagnostics(): WP_REST_Response {
		$catalog = $this->contracts->catalog();
		return new WP_REST_Response(
			array(
				'noderaVersion'      => NODERA_VERSION,
				'releaseStatus'      => defined( 'NODERA_RELEASE_STATUS' ) ? NODERA_RELEASE_STATUS : 'development',
				'wordpressVersion'   => get_bloginfo( 'version' ),
				'phpVersion'         => PHP_VERSION,
				'theme'              => wp_get_theme()->get_stylesheet(),
				'registeredBlocks'   => count( $catalog ),
				'aiAuthorableBlocks' => count( array_filter( $catalog, static fn( array $item ): bool => ! empty( $item['aiAuthorable'] ) ) ),
				'blockAdapters'      => $this->contracts->adapters(),
				'portableAi'         => array(
					'enabled'        => true,
					'apiKeyRequired' => false,
					'protocol'       => $this->protocols->descriptor(),
					'visualFidelity' => array(
						'version'            => '2.0',
						'devicePreview'      => array( 'Desktop', 'Tablet', 'Mobile' ),
						'designContextRoute' => '/nodera/v1/design-context',
					),
				),
				'breakpoints'        => $this->breakpoints->all(),
				'dynamicSources'     => $this->bindings->available_sources(),
				'migrations'         => $this->migrations->status(),
				'compatibility'      => $this->compatibility->report(),
				'commercial'         => array(
					'entitlement' => $this->entitlement->public_status(),
					'updates'     => $this->updates->public_status(),
				),
				'blockBindingsApi'   => function_exists( 'register_block_bindings_source' ),
				'interactivityApi'   => function_exists( 'wp_interactivity_state' ) || function_exists( 'wp_interactivity_config' ),
				'globalStylesApi'    => function_exists( 'wp_get_global_styles' ),
				'runtimeAssets'      => array(
					'editorJs'         => file_exists( NODERA_DIR . 'build/editor.js' ),
					'editorCss'        => file_exists( NODERA_DIR . 'build/editor.css' ),
					'assetMeta'        => file_exists( NODERA_DIR . 'build/editor.asset.php' ),
					'visualFidelityJs' => file_exists( NODERA_DIR . 'build/visual-fidelity.js' ),
					'visualFidelityCss'=> file_exists( NODERA_DIR . 'build/visual-fidelity.css' ),
				),
			),
			200
		);
	}
}
