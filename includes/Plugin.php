<?php
/**
 * Main plugin composition root.
 *
 * @package Nodera
 */

namespace Nodera;

use Nodera\Bindings\DynamicBindings;
use Nodera\Blocks\BlockRegistry;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use Nodera\Responsive\BreakpointRegistry;
use Nodera\Responsive\ResponsiveStyleCompiler;
use Nodera\Rest\AIRestController;
use Nodera\Rest\DiagnosticsController;

/**
 * Owns Nodera feature registration.
 */
final class Plugin {
	private static ?self $instance = null;
	private bool $booted = false;

	/**
	 * Return singleton instance.
	 */
	public static function instance(): self {
		return self::$instance ??= new self();
	}

	/**
	 * Boot all runtime modules once.
	 */
	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		$stable_ids  = new StableBlockId();
		$contracts   = new BlockContractRegistry();
		$breakpoints = new BreakpointRegistry();
		$responsive  = new ResponsiveStyleCompiler( $breakpoints );
		$bindings    = new DynamicBindings();
		$blocks      = new BlockRegistry();

		$stable_ids->register();
		$contracts->register();
		$responsive->register();
		$bindings->register();
		$blocks->register();
		( new AIRestController( $contracts ) )->register();
		( new DiagnosticsController( $contracts, $breakpoints ) )->register();

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	/**
	 * Enqueue the compiled editor application.
	 */
	public function enqueue_editor(): void {
		$script = NODERA_DIR . 'build/editor.js';
		if ( ! file_exists( $script ) ) {
			return;
		}

		$asset_file = NODERA_DIR . 'build/editor.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array(
			'dependencies' => array(),
			'version'      => NODERA_VERSION,
		);
		$version    = is_array( $asset ) && isset( $asset['version'] ) ? (string) $asset['version'] : NODERA_VERSION;
		$deps       = is_array( $asset ) && isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array();

		wp_enqueue_script( 'nodera-editor', NODERA_URL . 'build/editor.js', $deps, $version, true );
		if ( file_exists( NODERA_DIR . 'build/editor.css' ) ) {
			wp_enqueue_style( 'nodera-editor', NODERA_URL . 'build/editor.css', array( 'wp-components' ), $version );
		}

		$theme = wp_get_theme();
		wp_add_inline_script(
			'nodera-editor',
			'window.NoderaSettings=' . wp_json_encode(
				array(
					'version'     => NODERA_VERSION,
					'wordpress'   => get_bloginfo( 'version' ),
					'restRoot'    => esc_url_raw( rest_url( 'nodera/v1/' ) ),
					'nonce'       => wp_create_nonce( 'wp_rest' ),
					'theme'       => $theme->get_stylesheet(),
					'breakpoints' => ( new BreakpointRegistry() )->all(),
					'dynamicMeta' => DynamicBindings::META_KEY,
				)
			) . ';',
			'before'
		);
	}
}
