<?php
/**
 * Main plugin composition root.
 *
 * @package Nodera
 */

namespace Nodera;

use Nodera\Admin\SettingsPage;
use Nodera\AI\ProviderManager;
use Nodera\Bindings\DynamicBindings;
use Nodera\Blocks\BlockRegistry;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use Nodera\Responsive\BreakpointRegistry;
use Nodera\Responsive\ResponsiveStyleCompiler;
use Nodera\Rest\AIRestController;
use Nodera\Rest\DiagnosticsController;

/**
 * Owns Nodera feature registration while Gutenberg remains the editor engine.
 */
final class Plugin {
	private static ?self $instance = null;
	private bool $booted = false;
	private ?BreakpointRegistry $breakpoints = null;
	private ?ProviderManager $providers = null;

	public static function instance(): self {
		return self::$instance ??= new self();
	}

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		$stable_ids        = new StableBlockId();
		$contracts         = new BlockContractRegistry();
		$this->breakpoints = new BreakpointRegistry();
		$responsive        = new ResponsiveStyleCompiler( $this->breakpoints );
		$bindings          = new DynamicBindings();
		$blocks            = new BlockRegistry();
		$this->providers   = new ProviderManager();
		$settings          = new SettingsPage( $this->providers );

		$stable_ids->register();
		$contracts->register();
		// The compiler is retained only for alpha.4 legacy noderaResponsive/noderaStateStyles content.
		// New WordPress 7.1+ authoring writes directly to Gutenberg's native style attribute.
		$responsive->register();
		$bindings->register();
		$blocks->register();
		$settings->register();
		( new AIRestController( $contracts, $this->providers ) )->register();
		( new DiagnosticsController( $contracts, $this->breakpoints, $this->providers ) )->register();

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	/**
	 * Enqueue the single production editor runtime.
	 */
	public function enqueue_editor(): void {
		$schema_bootstrap = <<<'JS'
(function(wp){
	if(!wp || !wp.hooks){ return; }
	wp.hooks.addFilter('blocks.registerBlockType','nodera/persistent-attributes',function(settings){
		var attributes = Object.assign({}, settings.attributes || {});
		attributes.noderaId = attributes.noderaId || { type: 'string' };
		// Legacy alpha.4 attributes remain registered only so existing content keeps parsing.
		attributes.noderaResponsive = attributes.noderaResponsive || { type: 'object' };
		attributes.noderaStateStyles = attributes.noderaStateStyles || { type: 'object' };
		attributes.noderaCustomCSS = attributes.noderaCustomCSS || { type: 'string' };
		return Object.assign({}, settings, { attributes: attributes });
	});
})(window.wp);
JS;
		wp_add_inline_script( 'wp-blocks', $schema_bootstrap, 'after' );

		$script = NODERA_DIR . 'build/editor.js';
		if ( ! file_exists( $script ) ) {
			return;
		}
		$asset_file = NODERA_DIR . 'build/editor.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array( 'dependencies' => array(), 'version' => NODERA_VERSION );
		$version    = is_array( $asset ) && isset( $asset['version'] ) ? (string) $asset['version'] : NODERA_VERSION;
		$deps       = is_array( $asset ) && isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array();

		wp_enqueue_script( 'nodera-editor', NODERA_URL . 'build/editor.js', $deps, $version, true );
		if ( file_exists( NODERA_DIR . 'build/editor.css' ) ) {
			wp_enqueue_style( 'nodera-editor', NODERA_URL . 'build/editor.css', array( 'wp-components' ), $version );
		}

		$theme             = wp_get_theme();
		$native_responsive = version_compare( get_bloginfo( 'version' ), '7.1', '>=' );
		$breakpoints       = $this->breakpoints ?? new BreakpointRegistry();
		$providers         = $this->providers ?? new ProviderManager();
		wp_add_inline_script(
			'nodera-editor',
			'window.NoderaSettings=' . wp_json_encode(
				array(
					'version'           => NODERA_VERSION,
					'wordpress'         => get_bloginfo( 'version' ),
					'restRoot'          => esc_url_raw( rest_url( 'nodera/v1/' ) ),
					'nonce'             => wp_create_nonce( 'wp_rest' ),
					'theme'             => $theme->get_stylesheet(),
					'breakpoints'       => $this->editor_viewports( $native_responsive, $breakpoints ),
					'nativeResponsive'  => $native_responsive,
					'nativeStyleStates' => $native_responsive,
					'dynamicMeta'       => DynamicBindings::META_KEY,
					'provider'          => $providers->status(),
					'settingsUrl'       => current_user_can( 'manage_options' ) ? admin_url( 'options-general.php?page=nodera' ) : '',
				)
			) . ';',
			'before'
		);
	}

	private function editor_viewports( bool $native, BreakpointRegistry $legacy ): array {
		if ( ! $native ) {
			return $legacy->all();
		}
		$out = array(
			'mobile' => array( 'label' => 'Mobile', 'maxWidth' => '480px' ),
			'tablet' => array( 'label' => 'Tablet', 'maxWidth' => '782px' ),
		);
		if ( function_exists( 'wp_get_global_settings' ) ) {
			$viewport = wp_get_global_settings( array( 'viewport' ) );
			if ( is_array( $viewport ) ) {
				foreach ( array( 'mobile', 'tablet' ) as $name ) {
					if ( isset( $viewport[ $name ] ) && is_string( $viewport[ $name ] ) && '' !== $viewport[ $name ] ) {
						$out[ $name ]['maxWidth'] = $viewport[ $name ];
					}
				}
			}
		}
		return $out;
	}
}
