<?php
/**
 * Machine-readable Gutenberg block contracts.
 *
 * @package Nodera
 */

namespace Nodera\Contracts;

/**
 * Projects the live WordPress block registry into bounded AI contracts.
 */
final class BlockContractRegistry {
	private const DEFAULT_ALLOWED = array(
		'core/group',
		'core/columns',
		'core/column',
		'core/heading',
		'core/paragraph',
		'core/buttons',
		'core/button',
		'core/image',
		'core/video',
		'core/gallery',
		'core/list',
		'core/list-item',
		'core/separator',
		'core/spacer',
		'core/cover',
		'core/quote',
		'core/table',
		'core/navigation-link',
		'core/navigation-submenu',
		'core/accordion',
		'core/accordion-item',
		'core/accordion-heading',
		'core/accordion-panel',
		'core/tabs',
		'core/tab-list',
		'core/tab',
		'core/tab-panels',
		'core/tab-panel',
	);

	public function register(): void {}

	public function is_ai_authorable( string $name ): bool {
		$allowed = apply_filters( 'nodera_ai_authorable_blocks', self::DEFAULT_ALLOWED );
		$allowed = array_values( array_unique( array_map( 'strval', (array) $allowed ) ) );
		return in_array( $name, $allowed, true );
	}

	public function contract( string $name ): ?array {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type ) {
			return null;
		}
		$supports = is_array( $type->supports ) ? $type->supports : array();
		return array(
			'name'            => $name,
			'title'           => (string) $type->title,
			'apiVersion'      => property_exists( $type, 'api_version' ) ? (int) $type->api_version : 2,
			'attributes'      => is_array( $type->attributes ) ? $type->attributes : array(),
			'supports'        => $supports,
			'selectors'       => property_exists( $type, 'selectors' ) && is_array( $type->selectors ) ? $type->selectors : array(),
			'parent'          => is_array( $type->parent ) ? $type->parent : null,
			'ancestor'        => property_exists( $type, 'ancestor' ) && is_array( $type->ancestor ) ? $type->ancestor : null,
			'allowedBlocks'   => property_exists( $type, 'allowed_blocks' ) && is_array( $type->allowed_blocks ) ? $type->allowed_blocks : null,
			'usesContext'     => is_array( $type->uses_context ) ? $type->uses_context : array(),
			'providesContext' => is_array( $type->provides_context ) ? $type->provides_context : array(),
			'nodera'          => array(
				'aiAuthorable'       => $this->is_ai_authorable( $name ),
				'nativeResponsive'   => $this->has_design_supports( $supports ),
				'nativePseudoStates' => in_array( $name, array( 'core/button', 'core/navigation-link' ), true ),
				'bindingAttributes'  => $this->binding_attributes( $name ),
				'legacyBlock'        => str_starts_with( $name, 'nodera/' ),
			),
		);
	}

	public function catalog(): array {
		$out = array();
		foreach ( \WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			$out[] = array(
				'name'         => (string) $name,
				'title'        => (string) $type->title,
				'aiAuthorable' => $this->is_ai_authorable( (string) $name ),
				'legacy'       => str_starts_with( (string) $name, 'nodera/' ),
			);
		}
		return $out;
	}

	/**
	 * Select full contracts appropriate for the task.
	 */
	public function selection( string $task, array $existing_names, string $mode = 'focused' ): array {
		$names = array_values( array_unique( array_filter( array_map( 'strval', $existing_names ) ) ) );
		$text  = strtolower( $task );
		if ( 'full' === $mode ) {
			$names = array_merge( $names, self::DEFAULT_ALLOWED );
		} elseif ( 'expanded' === $mode || preg_match( '/redesign|create|hero|landing|gallery|video|tabs|accordion|thiết kế|tạo|hình ảnh|video|tab/u', $text ) ) {
			$names = array_merge(
				$names,
				array(
					'core/group', 'core/heading', 'core/paragraph', 'core/buttons', 'core/button', 'core/image', 'core/cover', 'core/columns', 'core/column',
					'core/accordion', 'core/accordion-item', 'core/accordion-heading', 'core/accordion-panel',
					'core/tabs', 'core/tab-list', 'core/tab', 'core/tab-panels', 'core/tab-panel',
				)
			);
		}
		$contracts = array();
		foreach ( array_values( array_unique( $names ) ) as $name ) {
			$contract = $this->contract( $name );
			if ( $contract && $contract['nodera']['aiAuthorable'] ) {
				$contracts[] = $contract;
			}
		}
		return $contracts;
	}

	/**
	 * Validate a set of attributes against the registered schema.
	 *
	 * @return array{valid:bool,code?:string,path?:string,message?:string}
	 */
	public function validate_attributes( string $name, array $attributes ): array {
		$contract = $this->contract( $name );
		if ( ! $contract ) {
			return array( 'valid' => false, 'code' => 'nodera_ai_unknown_block', 'message' => 'Block type is not registered.' );
		}
		$schema = $contract['attributes'];
		foreach ( $attributes as $key => $value ) {
			if ( ! array_key_exists( $key, $schema ) ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_unknown_attribute', 'path' => 'attributes.' . $key, 'message' => 'Attribute is not registered for this block.' );
			}
			$type = $schema[ $key ]['type'] ?? null;
			if ( $type && ! $this->matches_type( $value, $type ) ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_invalid_attribute_type', 'path' => 'attributes.' . $key, 'message' => 'Attribute type does not match the registered block schema.' );
			}
		}
		return array( 'valid' => true );
	}

	public function validate_relationship( string $name, ?string $parent_name, array $ancestors ): array {
		$contract = $this->contract( $name );
		if ( ! $contract ) {
			return array( 'valid' => false, 'message' => 'Unknown block type.' );
		}
		if ( $contract['parent'] && ( ! $parent_name || ! in_array( $parent_name, $contract['parent'], true ) ) ) {
			return array( 'valid' => false, 'message' => 'Block is not allowed under this parent.' );
		}
		if ( $contract['ancestor'] && ! array_intersect( $contract['ancestor'], $ancestors ) ) {
			return array( 'valid' => false, 'message' => 'Required ancestor is missing.' );
		}
		if ( $parent_name ) {
			$parent = $this->contract( $parent_name );
			if ( $parent && $parent['allowedBlocks'] && ! in_array( $name, $parent['allowedBlocks'], true ) ) {
				return array( 'valid' => false, 'message' => 'Parent does not allow this child block.' );
			}
		}
		return array( 'valid' => true );
	}

	private function has_design_supports( array $supports ): bool {
		foreach ( array( 'typography', 'color', 'background', 'border', 'dimensions', 'spacing', 'layout' ) as $key ) {
			if ( ! empty( $supports[ $key ] ) ) {
				return true;
			}
		}
		return false;
	}

	private function binding_attributes( string $name ): array {
		return match ( $name ) {
			'core/image'              => array( 'id', 'url', 'title', 'alt', 'caption' ),
			'core/heading',
			'core/paragraph'          => array( 'content' ),
			'core/button'             => array( 'url', 'text', 'linkTarget', 'rel' ),
			'core/navigation-link',
			'core/navigation-submenu' => array( 'url' ),
			'core/post-date'          => array( 'datetime' ),
			default                   => array(),
		};
	}

	private function matches_type( mixed $value, string|array $type ): bool {
		$types = (array) $type;
		foreach ( $types as $candidate ) {
			$valid = match ( $candidate ) {
				'string', 'rich-text' => is_string( $value ),
				'boolean'             => is_bool( $value ),
				'integer'             => is_int( $value ),
				'number'              => is_int( $value ) || is_float( $value ),
				'array'               => is_array( $value ) && array_is_list( $value ),
				'object'              => is_array( $value ) && ! array_is_list( $value ),
				'null'                => null === $value,
				default               => true,
			};
			if ( $valid ) {
				return true;
			}
		}
		return false;
	}
}
