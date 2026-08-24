<?php
/**
 * Main plugin composition root.
 *
 * @package Nodera
 */

namespace Nodera;

use Nodera\AI\ProviderManager;
use Nodera\Bindings\DynamicBindings;
use Nodera\Blocks\BlockRegistry;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use Nodera\Responsive\BreakpointRegistry;
use Nodera\Responsive\ResponsiveStyleCompiler;
use Nodera\Rest\AIRestController;
use Nodera\Rest\DiagnosticsController;

final class Plugin {
	private static ?self $instance = null;
	private bool $booted = false;

	public static function instance(): self {
		return self::$instance ??= new self();
	}

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		$stable_ids  = new StableBlockId();
		$contracts   = new BlockContractRegistry();
		$breakpoints = new BreakpointRegistry();
		$legacy_responsive = new ResponsiveStyleCompiler( $breakpoints );
		$bindings    = new DynamicBindings();
		$blocks      = new BlockRegistry();
		$providers   = new ProviderManager( $contracts );

		$stable_ids->register();
		$contracts->register();
		// Legacy compiler remains read-compatible with alpha.4 content. New UI writes WordPress 7.1 native style states.
		$legacy_responsive->register();
		$bindings->register();
		$blocks->register();
		$providers->register();
		( new AIRestController( $contracts ) )->register();
		( new DiagnosticsController( $contracts, $breakpoints ) )->register();

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	public function enqueue_editor(): void {
		$schema_bootstrap = <<<'JS'
(function(wp){
	if(!wp || !wp.hooks){ return; }
	wp.hooks.addFilter('blocks.registerBlockType','nodera/persistent-attributes',function(settings){
		var attributes = Object.assign({}, settings.attributes || {});
		attributes.noderaId = attributes.noderaId || { type: 'string' };
		// Legacy alpha.4 attributes remain registered so old content can render and migrate safely.
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
		$theme = wp_get_theme();
		$providers = new ProviderManager( new BlockContractRegistry() );
		wp_add_inline_script(
			'nodera-editor',
			'window.NoderaSettings=' . wp_json_encode(
				array(
					'version'            => NODERA_VERSION,
					'wordpress'          => get_bloginfo( 'version' ),
					'restRoot'           => esc_url_raw( rest_url( 'nodera/v1/' ) ),
					'nonce'              => wp_create_nonce( 'wp_rest' ),
					'theme'              => $theme->get_stylesheet(),
					'breakpoints'        => ( new BreakpointRegistry() )->all(),
					'dynamicMeta'        => DynamicBindings::META_KEY,
					'nativeResponsive'   => true,
					'nativePseudoStates' => array( 'core/button', 'core/navigation-link' ),
					'aiProvider'         => $providers->public_status(),
					'settingsUrl'        => admin_url( 'options-general.php?page=nodera-ai' ),
				)
			) . ';',
			'before'
		);
	}
}
