<?php
/**
 * Runtime compatibility diagnostics for support and release certification.
 *
 * @package Nodera
 */

namespace Nodera\Compatibility;

/**
 * Reports capabilities without claiming unverified compatibility.
 */
final class CompatibilityRegistry {
	/**
	 * Build a non-secret compatibility report for diagnostics/support.
	 */
	public function report(): array {
		$theme       = wp_get_theme();
		$acf_version = defined( 'ACF_VERSION' ) ? (string) ACF_VERSION : '';
		$woo_version = defined( 'WC_VERSION' ) ? (string) WC_VERSION : '';
		$gutenberg   = defined( 'GUTENBERG_VERSION' ) ? (string) GUTENBERG_VERSION : '';
		$report      = array(
			'wordpress'    => array(
				'version' => get_bloginfo( 'version' ),
				'ok'      => version_compare( get_bloginfo( 'version' ), NODERA_MIN_WP, '>=' ),
			),
			'php'          => array(
				'version' => PHP_VERSION,
				'ok'      => version_compare( PHP_VERSION, NODERA_MIN_PHP, '>=' ),
			),
			'theme'        => array(
				'slug'    => $theme->get_stylesheet(),
				'version' => (string) $theme->get( 'Version' ),
			),
			'integrations' => array(
				'acf'             => array(
					'active'  => function_exists( 'get_field' ),
					'version' => $acf_version,
				),
				'woocommerce'     => array(
					'active'  => function_exists( 'wc_get_product' ),
					'version' => $woo_version,
				),
				'gutenbergPlugin' => array(
					'active'  => '' !== $gutenberg,
					'version' => $gutenberg,
				),
			),
			'capabilities' => array(
				'blockBindings' => function_exists( 'register_block_bindings_source' ),
				'globalStyles'  => function_exists( 'wp_get_global_styles' ),
				'interactivity'  => function_exists( 'wp_interactivity_state' ) || function_exists( 'wp_interactivity_config' ),
				'openssl'        => function_exists( 'openssl_verify' ),
				'sodium'         => function_exists( 'sodium_crypto_sign_verify_detached' ),
				'mbstring'       => function_exists( 'mb_substr' ),
			),
		);
		$encoded                      = wp_json_encode( $report );
		$report['supportFingerprint'] = substr( hash( 'sha256', is_string( $encoded ) ? $encoded : '' ), 0, 20 );
		return $report;
	}
}
