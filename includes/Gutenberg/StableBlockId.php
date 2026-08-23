<?php
namespace Nodera\Gutenberg;

final class StableBlockId {
	public const ATTRIBUTE = 'noderaId';

	public function register(): void {
		add_filter( 'register_block_type_args', [ $this, 'register_attribute' ], 10, 2 );
		add_filter( 'render_block', [ $this, 'render_identity' ], 10, 2 );
	}

	public function register_attribute( array $args, string $name ): array {
		$args['attributes'] ??= [];
		if ( ! isset( $args['attributes'][ self::ATTRIBUTE ] ) ) {
			$args['attributes'][ self::ATTRIBUTE ] = [ 'type' => 'string' ];
		}
		return $args;
	}

	public static function is_valid( mixed $value ): bool {
		return is_string( $value ) && 1 === preg_match( '/^nd_[a-z0-9]{12,40}$/', $value );
	}

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
