<?php
namespace Nodera\Contracts;

final class BlockContractRegistry {
	private const DEFAULT_ALLOWED = [
		'core/group', 'core/columns', 'core/column', 'core/heading', 'core/paragraph',
		'core/buttons', 'core/button', 'core/image', 'core/video', 'core/gallery',
		'core/list', 'core/list-item', 'core/separator', 'core/spacer', 'core/cover',
	];

	public function register(): void {}

	public function is_ai_authorable( string $name ): bool {
		$allowed = apply_filters( 'nodera_ai_authorable_blocks', self::DEFAULT_ALLOWED );
		return in_array( $name, array_values( array_unique( array_map( 'strval', (array) $allowed ) ) ), true );
	}

	public function contract( string $name ): ?array {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type ) {
			return null;
		}
		$attributes = is_array( $type->attributes ) ? $type->attributes : [];
		return [
			'name' => $name,
			'title' => $type->title,
			'attributes' => $attributes,
			'supports' => is_array( $type->supports ) ? $type->supports : [],
			'parent' => $type->parent,
			'ancestor' => property_exists( $type, 'ancestor' ) ? $type->ancestor : null,
			'allowedBlocks' => property_exists( $type, 'allowed_blocks' ) ? $type->allowed_blocks : null,
			'nodera' => [ 'aiAuthorable' => $this->is_ai_authorable( $name ) ],
		];
	}

	public function catalog(): array {
		$out = [];
		foreach ( \WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			$out[] = [ 'name' => $name, 'title' => $type->title, 'aiAuthorable' => $this->is_ai_authorable( $name ) ];
		}
		return $out;
	}
}
