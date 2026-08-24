<?php
/**
 * Non-secret Nodera diagnostics.
 *
 * @package Nodera
 */

namespace Nodera\Rest;

use Nodera\AI\ProviderManager;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Responsive\BreakpointRegistry;
use WP_REST_Response;

/**
 * Exposes safe capability diagnostics to editors.
 */
final class DiagnosticsController {
	public function __construct(
		private BlockContractRegistry $contracts,
		private BreakpointRegistry $breakpoints,
		private ProviderManager $providers
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
				'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
				'callback'            => array( $this, 'get_diagnostics' ),
			)
		);
	}

	public function get_diagnostics(): WP_REST_Response {
		$catalog = $this->contracts->catalog();
		$registry = \WP_Block_Type_Registry::get_instance();
		return new WP_REST_Response(
			array(
				'noderaVersion'        => NODERA_VERSION,
				'wordpressVersion'     => get_bloginfo( 'version' ),
				'phpVersion'           => PHP_VERSION,
				'theme'                => wp_get_theme()->get_stylesheet(),
				'registeredBlocks'     => count( $catalog ),
				'aiAuthorableBlocks'   => count( array_filter( $catalog, static fn( array $item ) => ! empty( $item['aiAuthorable'] ) ) ),
				'legacyBreakpoints'    => $this->breakpoints->all(),
				'nativeResponsive'     => version_compare( get_bloginfo( 'version' ), '7.1', '>=' ),
				'nativeStyleStates'    => version_compare( get_bloginfo( 'version' ), '7.1', '>=' ),
				'coreTabs'             => (bool) $registry->get_registered( 'core/tabs' ),
				'coreAccordion'        => (bool) $registry->get_registered( 'core/accordion' ),
				'blockBindingsApi'     => function_exists( 'register_block_bindings_source' ),
				'interactivityApi'     => function_exists( 'wp_interactivity_state' ) || function_exists( 'wp_interactivity_config' ),
				'globalStylesApi'      => function_exists( 'wp_get_global_styles' ),
				'aiProvider'           => $this->providers->status(),
				'legacyRuntimeBridge'  => false,
			),
			200
		);
	}
}
