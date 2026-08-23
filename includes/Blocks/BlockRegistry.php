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
	/**
	 * Register on init.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_blocks' ) );
	}

	/**
	 * Register Accordion and Tabs from block.json metadata.
	 */
	public function register_blocks(): void {
		foreach ( array( 'accordion', 'tabs' ) as $block ) {
			$path = NODERA_DIR . 'blocks/' . $block;
			if ( file_exists( $path . '/block.json' ) ) {
				register_block_type( $path );
			}
		}
	}
}
