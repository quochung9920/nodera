<?php
/**
 * Signed commercial update delivery for Nodera.
 *
 * @package Nodera
 */

namespace Nodera\Commercial;

use WP_Error;

/**
 * Provides an inert-by-default updater. Existing editor/content features never depend on entitlement state.
 */
final class UpdateClient {
	private const MAX_MANIFEST_BYTES = 131072;
	private const MAX_PACKAGE_BYTES  = 104857600;
	private ?array $manifest_cache   = null;

	public function __construct( private EntitlementManager $entitlement ) {}

	/** Register WordPress update hooks only when the service has been explicitly configured. */
	public function register(): void {
		if ( ! $this->configured() ) {
			return;
		}
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'inject_update' ) );
		add_filter( 'plugins_api', array( $this, 'plugin_information' ), 20, 3 );
		add_filter( 'upgrader_pre_download', array( $this, 'secure_download' ), 20, 4 );
	}

	/** Add a verified update to the normal WordPress Plugins screen. */
	public function inject_update( mixed $transient ): mixed {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}
		$manifest = $this->manifest();
		if ( is_wp_error( $manifest ) || version_compare( NODERA_VERSION, (string) $manifest['version'], '>=' ) ) {
			return $transient;
		}
		$plugin = plugin_basename( NODERA_FILE );
		$item   = (object) array(
			'id'           => 'nodera',
			'slug'         => 'nodera',
			'plugin'       => $plugin,
			'new_version'  => (string) $manifest['version'],
			'url'          => (string) ( $manifest['details_url'] ?? '' ),
			'package'      => (string) $manifest['package'],
			'requires'     => (string) ( $manifest['requires'] ?? NODERA_MIN_WP ),
			'tested'       => (string) ( $manifest['tested'] ?? '' ),
			'requires_php' => (string) ( $manifest['requires_php'] ?? NODERA_MIN_PHP ),
		);
		$transient->response[ $plugin ] = $item;
		return $transient;
	}

	/** Supply verified plugin metadata for the WordPress update modal. */
	public function plugin_information( mixed $result, string $action, mixed $args ): mixed {
		if ( 'plugin_information' !== $action || ! is_object( $args ) || 'nodera' !== ( $args->slug ?? '' ) ) {
			return $result;
		}
		$manifest = $this->manifest();
		if ( is_wp_error( $manifest ) ) {
			return $result;
		}
		return (object) array(
			'name'          => 'Nodera — AI-native WordPress Builder',
			'slug'          => 'nodera',
			'version'       => (string) $manifest['version'],
			'requires'      => (string) ( $manifest['requires'] ?? NODERA_MIN_WP ),
			'tested'        => (string) ( $manifest['tested'] ?? '' ),
			'requires_php'  => (string) ( $manifest['requires_php'] ?? NODERA_MIN_PHP ),
			'download_link' => (string) $manifest['package'],
			'homepage'      => (string) ( $manifest['details_url'] ?? '' ),
			'sections'      => array(
				'description' => 'Signed commercial Nodera update.',
				'changelog'   => isset( $manifest['changelog'] ) && is_string( $manifest['changelog'] ) ? wp_kses_post( $manifest['changelog'] ) : '',
			),
		);
	}

	/** Download a signed package ourselves and verify its size and SHA-256 before installation. */
	public function secure_download( mixed $reply, string $package, mixed $upgrader, array $hook_extra ): mixed {
		unset( $upgrader );
		$plugin = isset( $hook_extra['plugin'] ) ? (string) $hook_extra['plugin'] : '';
		if ( plugin_basename( NODERA_FILE ) !== $plugin ) {
			return $reply;
		}
		$manifest = $this->manifest();
		if ( is_wp_error( $manifest ) ) {
			return $manifest;
		}
		if ( ! hash_equals( (string) $manifest['package'], $package ) ) {
			return new WP_Error( 'nodera_update_package_mismatch', 'Nodera update package URL does not match the signed manifest.' );
		}
		$temp = wp_tempnam( 'nodera-update.zip' );
		if ( ! is_string( $temp ) || '' === $temp ) {
			return new WP_Error( 'nodera_update_temp_failed', 'Could not allocate a temporary file for the Nodera update.' );
		}
		$response = wp_safe_remote_get(
			$package,
			array(
				'timeout'     => 60,
				'redirection' => 0,
				'stream'      => true,
				'filename'    => $temp,
				'headers'     => $this->request_headers(),
			)
		);
		if ( is_wp_error( $response ) ) {
			@unlink( $temp );
			return $response;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$size = file_exists( $temp ) ? filesize( $temp ) : false;
		if ( $code < 200 || $code >= 300 || false === $size ) {
			@unlink( $temp );
			return new WP_Error( 'nodera_update_download_failed', 'The signed Nodera package could not be downloaded.', array( 'status' => $code ) );
		}
		if ( $size <= 0 || $size > self::MAX_PACKAGE_BYTES ) {
			@unlink( $temp );
			return new WP_Error( 'nodera_update_package_size', 'The signed Nodera package is outside the allowed package size.', array( 'bytes' => $size ) );
		}
		$actual = hash_file( 'sha256', $temp );
		if ( ! is_string( $actual ) || ! hash_equals( strtolower( (string) $manifest['sha256'] ), strtolower( $actual ) ) ) {
			@unlink( $temp );
			return new WP_Error( 'nodera_update_checksum_failed', 'Nodera update SHA-256 verification failed.' );
		}
		return $temp;
	}

	/** Public, non-secret, network-free health status. */
	public function public_status(): array {
		return array(
			'configured'         => $this->configured(),
			'manifestVerified'   => is_array( $this->manifest_cache ),
			'availableVersion'   => is_array( $this->manifest_cache ) ? (string) ( $this->manifest_cache['version'] ?? '' ) : '',
			'currentVersion'     => NODERA_VERSION,
			'contentFeatureGate' => false,
		);
	}

	/** @return array|WP_Error */
	private function manifest(): array|WP_Error {
		if ( null !== $this->manifest_cache ) {
			return $this->manifest_cache;
		}
		$url = $this->manifest_url();
		if ( ! $this->safe_https_url( $url ) ) {
			return new WP_Error( 'nodera_update_invalid_manifest_url', 'Nodera update manifest URL must be a public HTTPS URL.' );
		}
		$response = wp_safe_remote_get(
			$url,
			array(
				'timeout'             => 10,
				'redirection'         => 0,
				'limit_response_size' => self::MAX_MANIFEST_BYTES,
				'headers'             => $this->request_headers(),
			)
		);
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return new WP_Error( 'nodera_update_manifest_http', 'Nodera update manifest returned an unexpected HTTP status.', array( 'status' => $code ) );
		}
		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) ) {
			return new WP_Error( 'nodera_update_invalid_manifest', 'Nodera update manifest is not valid JSON.' );
		}
		foreach ( array( 'version', 'package', 'sha256', 'signature' ) as $field ) {
			if ( ! isset( $data[ $field ] ) || ! is_string( $data[ $field ] ) || '' === trim( $data[ $field ] ) ) {
				return new WP_Error( 'nodera_update_invalid_manifest', 'Nodera update manifest is missing a required field.', array( 'field' => $field ) );
			}
		}
		if ( ! preg_match( '/^[a-f0-9]{64}$/i', $data['sha256'] ) || ! $this->safe_https_url( $data['package'] ) ) {
			return new WP_Error( 'nodera_update_invalid_manifest', 'Nodera update manifest contains an invalid package URL or checksum.' );
		}
		$signature = base64_decode( $data['signature'], true );
		$key       = $this->public_key();
		$message   = $data['version'] . "\n" . $data['package'] . "\n" . strtolower( $data['sha256'] );
		if ( false === $signature || '' === $key || ! function_exists( 'openssl_verify' ) ) {
			return new WP_Error( 'nodera_update_signature_unavailable', 'Nodera update signature verification is unavailable.' );
		}
		if ( 1 !== openssl_verify( $message, $signature, $key, OPENSSL_ALGO_SHA256 ) ) {
			return new WP_Error( 'nodera_update_signature_failed', 'Nodera update manifest signature verification failed.' );
		}
		$this->manifest_cache = $data;
		return $data;
	}

	private function request_headers(): array {
		$headers = array( 'Accept' => 'application/json' );
		$license = $this->entitlement->license_key();
		if ( '' !== $license ) {
			$headers['X-Nodera-License'] = $license;
		}
		$headers['X-Nodera-Version'] = NODERA_VERSION;
		return $headers;
	}

	private function configured(): bool {
		return '' !== $this->manifest_url() && '' !== $this->public_key();
	}

	private function manifest_url(): string {
		$value = defined( 'NODERA_UPDATE_MANIFEST_URL' ) && is_string( NODERA_UPDATE_MANIFEST_URL ) ? NODERA_UPDATE_MANIFEST_URL : '';
		return trim( (string) apply_filters( 'nodera_update_manifest_url', $value ) );
	}

	private function public_key(): string {
		$value = defined( 'NODERA_UPDATE_PUBLIC_KEY_PEM' ) && is_string( NODERA_UPDATE_PUBLIC_KEY_PEM ) ? NODERA_UPDATE_PUBLIC_KEY_PEM : '';
		return trim( (string) apply_filters( 'nodera_update_public_key_pem', $value ) );
	}

	private function safe_https_url( string $url ): bool {
		return 'https' === strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) ) && false !== wp_http_validate_url( $url );
	}
}
