<?php
namespace Nodera;

use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use Nodera\Rest\AIRestController;

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

		$stable_ids = new StableBlockId();
		$contracts  = new BlockContractRegistry();

		$stable_ids->register();
		$contracts->register();
		( new AIRestController( $contracts ) )->register();

		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor' ] );
	}

	public function enqueue_editor(): void {
		$asset_file = NODERA_DIR . 'build/editor.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : [ 'dependencies' => [ 'wp-blocks', 'wp-block-editor', 'wp-data', 'wp-element', 'wp-plugins', 'wp-edit-post', 'wp-components', 'wp-i18n', 'wp-api-fetch' ], 'version' => NODERA_VERSION ];
		if ( ! file_exists( NODERA_DIR . 'build/editor.js' ) ) {
			return;
		}
		wp_enqueue_script( 'nodera-editor', NODERA_URL . 'build/editor.js', $asset['dependencies'], $asset['version'], true );
		wp_enqueue_style( 'nodera-editor', NODERA_URL . 'build/editor.css', [ 'wp-components' ], $asset['version'] );
		wp_add_inline_script( 'nodera-editor', 'window.NoderaSettings=' . wp_json_encode( [ 'version' => NODERA_VERSION, 'restRoot' => esc_url_raw( rest_url( 'nodera/v1/' ) ), 'nonce' => wp_create_nonce( 'wp_rest' ) ] ) . ';', 'before' );
	}
}
