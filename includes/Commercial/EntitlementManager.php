<?php
/**
 * Optional commercial entitlement configuration.
 *
 * @package Nodera
 */

namespace Nodera\Commercial;

/**
 * Stores update/support entitlement only. Editor/content access is never gated by a license.
 */
final class EntitlementManager {
	public const OPTION = 'nodera_commercial_entitlement';

	/**
	 * Register an optional settings page for commercial update delivery.
	 */
	public function register(): void {
		add_action( 'admin_init', array( $this, 'register_setting' ) );
		add_action( 'admin_menu', array( $this, 'register_page' ) );
	}

	public function register_setting(): void {
		register_setting(
			'nodera_commercial',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => array(),
			)
		);
	}

	public function sanitize( mixed $input ): array {
		$existing = $this->stored();
		$input    = is_array( $input ) ? $input : array();
		$key      = isset( $input['licenseKey'] ) ? trim( sanitize_text_field( (string) $input['licenseKey'] ) ) : '';
		if ( '' === $key && ! empty( $existing['licenseKey'] ) ) {
			$key = (string) $existing['licenseKey'];
		}
		if ( ! empty( $input['clearLicense'] ) ) {
			$key = '';
		}
		return array( 'licenseKey' => $key );
	}

	public function register_page(): void {
		add_options_page(
			'Nodera Commercial',
			'Nodera Commercial',
			'manage_options',
			'nodera-commercial',
			array( $this, 'render_page' )
		);
	}

	public function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$status = $this->public_status();
		echo '<div class="wrap"><h1>Nodera Commercial</h1>';
		echo '<p>Licensing controls update/support entitlement only. Existing Gutenberg content and Nodera editing are never disabled when a license is absent or expires.</p>';
		echo '<p><strong>Update service:</strong> ' . esc_html( $status['updateServiceConfigured'] ? 'configured' : 'not configured' ) . '</p>';
		echo '<form method="post" action="options.php">';
		settings_fields( 'nodera_commercial' );
		echo '<table class="form-table"><tr><th scope="row"><label for="nodera-license">License key</label></th><td>';
		echo '<input id="nodera-license" name="' . esc_attr( self::OPTION ) . '[licenseKey]" type="password" class="regular-text" value="" autocomplete="off" placeholder="' . esc_attr( $status['licenseConfigured'] ? 'Saved — enter a new key to replace' : 'Optional' ) . '" />';
		echo '<p class="description">For production, define NODERA_LICENSE_KEY in wp-config.php instead of storing it in the database.</p>';
		echo '<label><input type="checkbox" name="' . esc_attr( self::OPTION ) . '[clearLicense]" value="1" /> Clear stored license</label>';
		echo '</td></tr></table>';
		submit_button();
		echo '</form></div>';
	}

	/**
	 * Return the entitlement secret to server-side update requests only.
	 */
	public function license_key(): string {
		if ( defined( 'NODERA_LICENSE_KEY' ) && is_string( NODERA_LICENSE_KEY ) ) {
			return trim( NODERA_LICENSE_KEY );
		}
		$stored = $this->stored();
		return isset( $stored['licenseKey'] ) ? trim( (string) $stored['licenseKey'] ) : '';
	}

	/**
	 * Safe status for diagnostics/UI.
	 */
	public function public_status(): array {
		return array(
			'licenseConfigured'       => '' !== $this->license_key(),
			'licenseSource'           => defined( 'NODERA_LICENSE_KEY' ) ? 'wp-config' : ( '' !== $this->license_key() ? 'database' : 'none' ),
			'updateServiceConfigured' => $this->update_service_configured(),
			'featureGating'           => false,
		);
	}

	private function update_service_configured(): bool {
		$url = defined( 'NODERA_UPDATE_MANIFEST_URL' ) && is_string( NODERA_UPDATE_MANIFEST_URL ) ? trim( NODERA_UPDATE_MANIFEST_URL ) : '';
		$key = defined( 'NODERA_UPDATE_PUBLIC_KEY_PEM' ) && is_string( NODERA_UPDATE_PUBLIC_KEY_PEM ) ? trim( NODERA_UPDATE_PUBLIC_KEY_PEM ) : '';
		return '' !== $url && '' !== $key;
	}

	private function stored(): array {
		$value = get_option( self::OPTION, array() );
		return is_array( $value ) ? $value : array();
	}
}
