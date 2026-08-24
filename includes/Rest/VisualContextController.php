<?php
/**
 * High-fidelity visual/design context for portable external AI workflows.
 *
 * @package Nodera
 */

namespace Nodera\Rest;

use WP_REST_Response;

/**
 * Exposes bounded, non-secret resolved design-system facts to editors.
 */
final class VisualContextController {
	private const MAX_DEPTH = 10;
	private const MAX_ITEMS = 300;
	private const MAX_STRING = 10000;

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_route' ) );
	}

	public function register_route(): void {
		register_rest_route(
			'nodera/v1',
			'/design-context',
			array(
				'methods'             => 'GET',
				'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
				'callback'            => array( $this, 'get_context' ),
			)
		);
	}

	public function get_context(): WP_REST_Response {
		$theme    = wp_get_theme();
		$settings = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings() : array();
		$styles   = function_exists( 'wp_get_global_styles' ) ? wp_get_global_styles() : array();

		return new WP_REST_Response(
			array(
				'schema' => 'nodera-design-context/v1',
				'theme'  => array(
					'stylesheet' => $theme->get_stylesheet(),
					'template'   => $theme->get_template(),
					'name'       => $theme->get( 'Name' ),
					'version'    => $theme->get( 'Version' ),
				),
				'settings' => $this->bound( is_array( $settings ) ? $settings : array(), 0 ),
				'styles'   => $this->bound( is_array( $styles ) ? $styles : array(), 0 ),
				'native'   => array(
					'globalStyles'   => function_exists( 'wp_get_global_styles' ),
					'globalSettings' => function_exists( 'wp_get_global_settings' ),
				),
			),
			200
		);
	}

	private function bound( mixed $value, int $depth ): mixed {
		if ( $depth > self::MAX_DEPTH ) {
			return null;
		}
		if ( is_string( $value ) ) {
			return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, self::MAX_STRING ) : substr( $value, 0, self::MAX_STRING );
		}
		if ( ! is_array( $value ) ) {
			return is_scalar( $value ) || null === $value ? $value : null;
		}
		$out   = array();
		$count = 0;
		foreach ( $value as $key => $item ) {
			if ( ++$count > self::MAX_ITEMS ) {
				break;
			}
			$name = is_string( $key ) ? strtolower( $key ) : '';
			if ( $name && preg_match( '/(?:api[_-]?key|password|passwd|secret|authorization|cookie|nonce|access[_-]?token|refresh[_-]?token)/', $name ) ) {
				$out[ $key ] = '[redacted]';
				continue;
			}
			$out[ $key ] = $this->bound( $item, $depth + 1 );
		}
		return $out;
	}
}
