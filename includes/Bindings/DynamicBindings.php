<?php
/**
 * Native Block Bindings integration.
 *
 * @package Nodera
 */

namespace Nodera\Bindings;

use WP_Block;

/**
 * Registers safe native WordPress binding sources without creating a parallel data engine.
 */
final class DynamicBindings {
	public const META_KEY = 'nodera_dynamic_text';

	/**
	 * Register dynamic-data support.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_meta' ), 20 );
		add_action( 'init', array( $this, 'register_sources' ), 21 );
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

	/**
	 * Register optional ecosystem adapters through the native Block Bindings API.
	 */
	public function register_sources(): void {
		if ( ! function_exists( 'register_block_bindings_source' ) ) {
			return;
		}
		if ( function_exists( 'get_field' ) ) {
			register_block_bindings_source(
				'nodera/acf-field',
				array(
					'label'              => 'Nodera — ACF Field',
					'uses_context'       => array( 'postId' ),
					'get_value_callback' => array( $this, 'acf_value' ),
				)
			);
		}
		if ( function_exists( 'wc_get_product' ) ) {
			register_block_bindings_source(
				'nodera/woocommerce-product',
				array(
					'label'              => 'Nodera — WooCommerce Product',
					'uses_context'       => array( 'postId' ),
					'get_value_callback' => array( $this, 'woocommerce_value' ),
				)
			);
		}
	}

	/**
	 * Resolve one explicitly named ACF scalar field for the current post.
	 */
	public function acf_value( array $source_args, WP_Block $block_instance, string $attribute_name ): mixed {
		unset( $attribute_name );
		$field = isset( $source_args['field'] ) ? (string) $source_args['field'] : '';
		if ( ! preg_match( '/^[A-Za-z0-9_-]{1,100}$/', $field ) || ! function_exists( 'get_field' ) ) {
			return null;
		}
		$post_id = isset( $block_instance->context['postId'] ) ? (int) $block_instance->context['postId'] : 0;
		if ( ! $this->can_read_post( $post_id ) ) {
			return null;
		}
		$value = get_field( $field, $post_id );
		if ( is_string( $value ) || is_numeric( $value ) || is_bool( $value ) ) {
			return $value;
		}
		return null;
	}

	/**
	 * Resolve an allowlisted WooCommerce product property for the current post.
	 */
	public function woocommerce_value( array $source_args, WP_Block $block_instance, string $attribute_name ): mixed {
		unset( $attribute_name );
		$field   = isset( $source_args['field'] ) ? (string) $source_args['field'] : '';
		$allowed = array( 'name', 'sku', 'price', 'regular_price', 'sale_price', 'stock_status', 'permalink' );
		if ( ! in_array( $field, $allowed, true ) || ! function_exists( 'wc_get_product' ) ) {
			return null;
		}
		$post_id = isset( $block_instance->context['postId'] ) ? (int) $block_instance->context['postId'] : 0;
		if ( ! $this->can_read_post( $post_id ) ) {
			return null;
		}
		$product = wc_get_product( $post_id );
		if ( ! $product ) {
			return null;
		}
		return match ( $field ) {
			'name'          => $product->get_name(),
			'sku'           => $product->get_sku(),
			'price'         => $product->get_price(),
			'regular_price' => $product->get_regular_price(),
			'sale_price'    => $product->get_sale_price(),
			'stock_status'  => $product->get_stock_status(),
			'permalink'     => get_permalink( $post_id ),
			default         => null,
		};
	}

	/**
	 * Safe capability description for the editor and diagnostics.
	 */
	public function available_sources(): array {
		return array(
			array( 'id' => 'core/post-meta', 'label' => 'Nodera safe post meta', 'available' => true ),
			array( 'id' => 'core/post-data', 'label' => 'Core post data', 'available' => true ),
			array( 'id' => 'nodera/acf-field', 'label' => 'ACF field', 'available' => function_exists( 'get_field' ) ),
			array( 'id' => 'nodera/woocommerce-product', 'label' => 'WooCommerce product', 'available' => function_exists( 'wc_get_product' ) ),
		);
	}

	/**
	 * Public published content may resolve on the frontend; private content remains capability protected.
	 */
	private function can_read_post( int $post_id ): bool {
		if ( $post_id <= 0 ) {
			return false;
		}
		$status = get_post_status( $post_id );
		if ( 'publish' === $status ) {
			return true;
		}
		return current_user_can( 'read_post', $post_id );
	}
}
