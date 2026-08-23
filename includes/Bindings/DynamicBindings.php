<?php
/**
 * Native Block Bindings integration.
 *
 * @package Nodera
 */

namespace Nodera\Bindings;

/**
 * Registers one safe post-meta source for the first Nodera dynamic-data workflow.
 */
final class DynamicBindings {
	public const META_KEY = 'nodera_dynamic_text';

	/**
	 * Register dynamic-data support.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_meta' ), 20 );
	}

	/**
	 * Register a REST-visible string meta key on public REST post types.
	 */
	public function register_meta(): void {
		$post_types = get_post_types( array( 'show_in_rest' => true ), 'names' );
		foreach ( $post_types as $post_type ) {
			register_post_meta(
				$post_type,
				self::META_KEY,
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
						unset( $allowed, $meta_key );
						return current_user_can( 'edit_post', $post_id );
					},
				)
			);
		}
	}
}
