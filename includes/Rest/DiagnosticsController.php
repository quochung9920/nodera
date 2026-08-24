<?php
/**
 * Non-secret Nodera diagnostics.
 *
 * @package Nodera
 */

namespace Nodera\Rest;

use Nodera\Contracts\BlockContractRegistry;
use Nodera\Responsive\BreakpointRegistry;
use WP_REST_Response;

/**
 * Exposes safe capability diagnostics to editors.
 */
final class DiagnosticsController {
	public function __construct( private BlockContractRegistry $contracts, private BreakpointRegistry $breakpoints ) {}

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
		return new WP_REST_Response(
			array(
				'noderaVersion'       => NODERA_VERSION,
				'releaseStatus'       => defined( 'NODERA_RELEASE_STATUS' ) ? NODERA_RELEASE_STATUS : 'development',
				'wordpressVersion'    => get_bloginfo( 'version' ),
				'phpVersion'          => PHP_VERSION,
				'theme'               => wp_get_theme()->get_stylesheet(),
				'registeredBlocks'    => count( $catalog ),
				'aiAuthorableBlocks'  => count( array_filter( $catalog, static fn( array $item ) => ! empty( $item['aiAuthorable'] ) ) ),
				'breakpoints'         => $this->breakpoints->all(),
				'blockBindingsApi'    => function_exists( 'register_block_bindings_source' ),
				'interactivityApi'    => function_exists( 'wp_interactivity_state' ) || function_exists( 'wp_interactivity_config' ),
				'globalStylesApi'     => function_exists( 'wp_get_global_styles' ),
				'runtimeAssets'       => array(
					'editorJs'  => file_exists( NODERA_DIR . 'build/editor.js' ),
					'editorCss' => file_exists( NODERA_DIR . 'build/editor.css' ),
					'assetMeta' => file_exists( NODERA_DIR . 'build/editor.asset.php' ),
				),
			),
			200
		);
	}
}
