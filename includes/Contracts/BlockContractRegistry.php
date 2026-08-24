<?php
/**
 * Machine-readable Gutenberg block contracts.
 *
 * @package Nodera
 */

namespace Nodera\Contracts;

final class BlockContractRegistry {
	private const DEFAULT_ALLOWED = array(
		'core/group', 'core/columns', 'core/column', 'core/heading', 'core/paragraph',
		'core/buttons', 'core/button', 'core/image', 'core/video', 'core/gallery',
		'core/list', 'core/list-item', 'core/separator', 'core/spacer', 'core/cover',
		'core/accordion', 'core/accordion-item', 'core/accordion-heading', 'core/accordion-panel',
		'core/tabs', 'core/tab-list', 'core/tab-panels', 'core/tab-panel',
	);

	public function register(): void {}

	public function is_ai_authorable( string $name ): bool {
		$allowed = apply_filters( 'nodera_ai_authorable_blocks', self::DEFAULT_ALLOWED );
		return in_array( $name, array_values( array_unique( array_map( 'strval', (array) $allowed ) ) ), true );
	}

	public function contract( string $name ): ?array {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type ) return null;
		return array(
			'name' => $name, 'title' => (string) $type->title,
			'attributes' => is_array( $type->attributes ) ? $type->attributes : array(),
			'supports' => is_array( $type->supports ) ? $type->supports : array(),
			'parent' => is_array( $type->parent ) ? $type->parent : null,
			'ancestor' => property_exists( $type, 'ancestor' ) && is_array( $type->ancestor ) ? $type->ancestor : null,
			'allowedBlocks' => property_exists( $type, 'allowed_blocks' ) && is_array( $type->allowed_blocks ) ? $type->allowed_blocks : null,
			'usesContext' => is_array( $type->uses_context ) ? $type->uses_context : array(),
			'providesContext' => is_array( $type->provides_context ) ? $type->provides_context : array(),
			'nodera' => array(
				'aiAuthorable' => $this->is_ai_authorable( $name ),
				'nativeResponsiveStates' => version_compare( get_bloginfo( 'version' ), '7.1', '>=' ),
				'nativePseudoStates' => in_array( $name, array( 'core/button', 'core/navigation-link' ), true ) ? array( ':hover', ':focus', ':focus-visible', ':active' ) : array(),
			),
		);
	}

	public function catalog(): array {
		$out = array();
		foreach ( \WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			$out[] = array( 'name' => (string) $name, 'title' => (string) $type->title, 'aiAuthorable' => $this->is_ai_authorable( (string) $name ) );
		}
		return $out;
	}

	public function selection( string $task, array $existing_names, string $mode = 'focused' ): array {
		$names = array_values( array_unique( array_filter( array_map( 'strval', $existing_names ) ) ) );
		$text = strtolower( $task );
		if ( 'full' === $mode ) {
			$names = array_merge( $names, self::DEFAULT_ALLOWED );
		} elseif ( 'expanded' === $mode || preg_match( '/redesign|create|hero|landing|gallery|video|tabs|accordion|thiết kế|tạo|hình ảnh|video/u', $text ) ) {
			$names = array_merge( $names, array(
				'core/group','core/heading','core/paragraph','core/buttons','core/button','core/image','core/cover','core/columns','core/column',
				'core/accordion','core/accordion-item','core/accordion-heading','core/accordion-panel',
				'core/tabs','core/tab-list','core/tab-panels','core/tab-panel',
			) );
		}
		$out = array();
		foreach ( array_values( array_unique( $names ) ) as $name ) {
			$contract = $this->contract( $name );
			if ( $contract && $contract['nodera']['aiAuthorable'] ) $out[] = $contract;
		}
		return $out;
	}

	public function validate_attributes( string $name, array $attributes ): array {
		$contract = $this->contract( $name );
		if ( ! $contract ) return array( 'valid' => false, 'code' => 'nodera_ai_unknown_block', 'message' => 'Block type is not registered.' );
		$schema = $contract['attributes'];
		foreach ( $attributes as $key => $value ) {
			if ( ! array_key_exists( $key, $schema ) ) return array( 'valid' => false, 'code' => 'nodera_ai_unknown_attribute', 'path' => 'attributes.' . $key, 'message' => 'Attribute is not registered for this block.' );
			$type = $schema[ $key ]['type'] ?? null;
			if ( $type && ! $this->matches_type( $value, $type ) ) return array( 'valid' => false, 'code' => 'nodera_ai_invalid_attribute_type', 'path' => 'attributes.' . $key, 'message' => 'Attribute type does not match the registered block schema.' );
		}
		if ( isset( $attributes['style'] ) ) {
			$style = $this->validate_style( $name, $attributes['style'] );
			if ( ! $style['valid'] ) return $style;
		}
		return array( 'valid' => true );
	}

	public function validate_relationship( string $name, ?string $parent_name, array $ancestors ): array {
		$contract = $this->contract( $name );
		if ( ! $contract ) return array( 'valid' => false, 'message' => 'Unknown block type.' );
		if ( $contract['parent'] && ( ! $parent_name || ! in_array( $parent_name, $contract['parent'], true ) ) ) return array( 'valid' => false, 'message' => 'Block is not allowed under this parent.' );
		if ( $contract['ancestor'] && ! array_intersect( $contract['ancestor'], $ancestors ) ) return array( 'valid' => false, 'message' => 'Required ancestor is missing.' );
		if ( $parent_name ) {
			$parent = $this->contract( $parent_name );
			if ( $parent && $parent['allowedBlocks'] && ! in_array( $name, $parent['allowedBlocks'], true ) ) return array( 'valid' => false, 'message' => 'Parent does not allow this child block.' );
		}
		return array( 'valid' => true );
	}

	private function validate_style( string $name, mixed $style ): array {
		if ( ! is_array( $style ) || array_is_list( $style ) ) return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style', 'path' => 'attributes.style', 'message' => 'Style must be an object.' );
		$pseudo = array( ':hover', ':focus', ':focus-visible', ':active' );
		foreach ( array_keys( $style ) as $key ) {
			if ( is_string( $key ) && str_starts_with( $key, '@' ) && ! in_array( $key, array( '@mobile', '@tablet' ), true ) ) return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_state', 'path' => 'attributes.style.' . $key, 'message' => 'Unsupported responsive style state.' );
			if ( is_string( $key ) && str_starts_with( $key, ':' ) && ( ! in_array( $key, $pseudo, true ) || ! in_array( $name, array( 'core/button', 'core/navigation-link' ), true ) ) ) return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_state', 'path' => 'attributes.style.' . $key, 'message' => 'Pseudo state is not supported by this Core block.' );
		}
		return $this->validate_style_values( $style, 'attributes.style', 0 );
	}

	private function validate_style_values( array $value, string $path, int $depth ): array {
		if ( $depth > 10 ) return array( 'valid' => false, 'code' => 'nodera_ai_style_too_deep', 'path' => $path, 'message' => 'Style nesting is too deep.' );
		foreach ( $value as $key => $item ) {
			$next = $path . '.' . (string) $key;
			if ( is_array( $item ) ) {
				$result = $this->validate_style_values( $item, $next, $depth + 1 );
				if ( ! $result['valid'] ) return $result;
			} elseif ( is_string( $item ) ) {
				if ( strlen( $item ) > 240 || preg_match( '/[{};<>]/', $item ) || false !== stripos( $item, 'url(' ) || false !== stripos( $item, 'expression(' ) ) return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_value', 'path' => $next, 'message' => 'Style value is outside the safe grammar.' );
			} elseif ( ! is_scalar( $item ) && null !== $item ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_value', 'path' => $next, 'message' => 'Style value is invalid.' );
			}
		}
		return array( 'valid' => true );
	}

	private function matches_type( mixed $value, string|array $type ): bool {
		foreach ( (array) $type as $candidate ) {
			$valid = match ( $candidate ) {
				'string' => is_string( $value ), 'boolean' => is_bool( $value ), 'integer' => is_int( $value ), 'number' => is_int( $value ) || is_float( $value ),
				'array' => is_array( $value ) && array_is_list( $value ), 'object' => is_array( $value ) && ! array_is_list( $value ), 'null' => null === $value, default => true,
			};
			if ( $valid ) return true;
		}
		return false;
	}
}
