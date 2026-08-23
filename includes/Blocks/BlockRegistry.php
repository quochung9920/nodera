<?php
/**
 * Nodera custom block registration.
 *
 * @package Nodera
 */

namespace Nodera\Blocks;

/**
 * Registers only blocks that add capability not already covered by core.
 */
final class BlockRegistry {
	public function register(): void {
		add_action( 'init', array( $this, 'register_blocks' ) );
	}

	public function register_blocks(): void {
		$this->register_script_module( 'nodera/accordion-view', 'accordion-view' );
		$this->register_script_module( 'nodera/tabs-view', 'tabs-view' );
		foreach ( array( 'accordion', 'tabs' ) as $block ) {
			$path = NODERA_DIR . 'blocks/' . $block;
			if ( file_exists( $path . '/block.json' ) ) {
				register_block_type( $path );
			}
		}
	}

	private function register_script_module( string $id, string $file ): void {
		$script = NODERA_DIR . 'build/' . $file . '.js';
		if ( ! file_exists( $script ) || ! function_exists( 'wp_register_script_module' ) ) {
			return;
		}
		$asset_file = NODERA_DIR . 'build/' . $file . '.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array( 'dependencies' => array( '@wordpress/interactivity' ), 'version' => NODERA_VERSION );
		wp_register_script_module( $id, NODERA_URL . 'build/' . $file . '.js', (array) ( $asset['dependencies'] ?? array() ), $asset['version'] ?? NODERA_VERSION );
	}
}
