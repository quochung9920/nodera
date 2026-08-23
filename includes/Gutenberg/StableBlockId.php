<?php
/**
 * Persistent Gutenberg block identity.
 *
 * @package Nodera
 */

namespace Nodera\Gutenberg;

/**
 * Registers the persistent noderaId attribute and exposes it at render time.
 */
final class StableBlockId {
	public const ATTRIBUTE = 'noderaId';

	/**
	 * Register identity hooks.
	 */
	public function register(): void {
		add_filter( 'register_block_type_args', array( $this, 'register_attribute' ), 10, 2 );
		add_filter( 'render_block', array( $this, 'render_identity' ), 10, 2 );
	}

	/**
	 * Add the Nodera ID to every registered block schema.
	 *
	 * @param array  $args Block type args.
	 * @param string $name Block name.
	 * @return array
	 */
	public function register_attribute( array $args, string $name ): array {
		unset( $name );
		$args['attributes'] ??= array();
		if ( ! isset( $args['attributes'][ self::ATTRIBUTE ] ) ) {
			$args['attributes'][ self::ATTRIBUTE ] = array( 'type' => 'string' );
		}
		return $args;
	}

	/**
	 * Validate a stable ID.
	 *
	 * @param mixed $value Candidate value.
	 */
	public static function is_valid( mixed $value ): bool {
		return is_string( $value ) && 1 === preg_match( '/^nd_[a-z0-9]{12,40}$/', $value );
	}

	/**
	 * Add the stable ID to the first rendered element without rewriting HTML via regex.
	 *
	 * @param string $content Rendered block content.
	 * @param array  $block Parsed block.
	 */
	public function render_identity( string $content, array $block ): string {
		$id = $block['attrs'][ self::ATTRIBUTE ] ?? '';
		if ( ! self::is_valid( $id ) || '' === trim( $content ) || ! class_exists( '\\WP_HTML_Tag_Processor' ) ) {
			return $content;
		}
		$processor = new \WP_HTML_Tag_Processor( $content );
		if ( ! $processor->next_tag() ) {
			return $content;
		}
		$processor->set_attribute( 'data-nodera-id', $id );
		return $processor->get_updated_html();
	}
}
