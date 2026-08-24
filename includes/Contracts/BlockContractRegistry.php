<?php
/**
 * Machine-readable Gutenberg block contracts.
 *
 * @package Nodera
 */

namespace Nodera\Contracts;

/**
 * Builds AI-safe contracts from the live WordPress block registry.
 *
 * Third-party blocks are read-only to AI by default. A trusted integration can
 * explicitly register an adapter during `nodera_register_block_contract_adapters`.
 */
final class BlockContractRegistry {
	private const DEFAULT_ALLOWED = array(
		'core/group', 'core/columns', 'core/column', 'core/heading', 'core/paragraph',
		'core/buttons', 'core/button', 'core/image', 'core/video', 'core/gallery',
		'core/list', 'core/list-item', 'core/separator', 'core/spacer', 'core/cover',
		'core/accordion', 'core/accordion-item', 'core/accordion-heading', 'core/accordion-panel',
		'core/tabs', 'core/tab-list', 'core/tab-panels', 'core/tab-panel',
	);

	/** @var array<string,array<string,mixed>> */
	private array $adapters = array();
	private bool $adapters_collected = false;

	/** Register adapter collection after normal block registration has had a chance to run. */
	public function register(): void {
		add_action( 'init', array( $this, 'collect_adapters' ), 100 );
	}

	/** Let trusted plugins describe a third-party block without forking Gutenberg. */
	public function collect_adapters(): void {
		if ( $this->adapters_collected ) {
			return;
		}
		$this->adapters_collected = true;
		do_action( 'nodera_register_block_contract_adapters', $this );
	}

	/**
	 * Register a third-party AI contract adapter.
	 *
	 * Supported config:
	 * - aiAuthorable: bool, defaults false.
	 * - attributeAllowlist: string[] limiting the live registered schema.
	 * - validateAttributes: callable(array $attributes, array $contract): bool|array.
	 * - transformContract: callable(array $contract): array.
	 */
	public function register_adapter( string $block_name, array $config ): bool {
		if ( ! preg_match( '/^[a-z0-9-]+\/[a-z0-9-]+$/', $block_name ) ) {
			return false;
		}
		$adapter = array(
			'aiAuthorable'       => ! empty( $config['aiAuthorable'] ),
			'attributeAllowlist' => array_values( array_unique( array_filter( array_map( 'strval', (array) ( $config['attributeAllowlist'] ?? array() ) ) ) ) ),
		);
		if ( isset( $config['validateAttributes'] ) && is_callable( $config['validateAttributes'] ) ) {
			$adapter['validateAttributes'] = $config['validateAttributes'];
		}
		if ( isset( $config['transformContract'] ) && is_callable( $config['transformContract'] ) ) {
			$adapter['transformContract'] = $config['transformContract'];
		}
		$this->adapters[ $block_name ] = $adapter;
		return true;
	}

	/** Safe adapter metadata for diagnostics and contracts. */
	public function adapters(): array {
		$this->ensure_adapters();
		$out = array();
		foreach ( $this->adapters as $name => $config ) {
			$out[ $name ] = array(
				'aiAuthorable'       => ! empty( $config['aiAuthorable'] ),
				'attributeAllowlist' => (array) ( $config['attributeAllowlist'] ?? array() ),
			);
		}
		return $out;
	}

	public function is_ai_authorable( string $name ): bool {
		$this->ensure_adapters();
		if ( isset( $this->adapters[ $name ] ) ) {
			return ! empty( $this->adapters[ $name ]['aiAuthorable'] );
		}
		$allowed = apply_filters( 'nodera_ai_authorable_blocks', self::DEFAULT_ALLOWED );
		return in_array( $name, array_values( array_unique( array_map( 'strval', (array) $allowed ) ) ), true );
	}

	public function contract( string $name ): ?array {
		$this->ensure_adapters();
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type ) {
			return null;
		}
		$attributes = is_array( $type->attributes ) ? $type->attributes : array();
		$adapter    = $this->adapters[ $name ] ?? null;
		if ( is_array( $adapter ) && ! empty( $adapter['attributeAllowlist'] ) ) {
			$attributes = array_intersect_key( $attributes, array_flip( (array) $adapter['attributeAllowlist'] ) );
		}
		$contract = array(
			'name'            => $name,
			'title'           => (string) $type->title,
			'attributes'      => $attributes,
			'supports'        => is_array( $type->supports ) ? $type->supports : array(),
			'parent'          => is_array( $type->parent ) ? $type->parent : null,
			'ancestor'        => property_exists( $type, 'ancestor' ) && is_array( $type->ancestor ) ? $type->ancestor : null,
			'allowedBlocks'   => property_exists( $type, 'allowed_blocks' ) && is_array( $type->allowed_blocks ) ? $type->allowed_blocks : null,
			'usesContext'     => is_array( $type->uses_context ) ? $type->uses_context : array(),
			'providesContext' => is_array( $type->provides_context ) ? $type->provides_context : array(),
			'nodera'          => array(
				'aiAuthorable'              => $this->is_ai_authorable( $name ),
				'nativeResponsiveStates'    => version_compare( get_bloginfo( 'version' ), '7.1', '>=' ),
				'nativePseudoStates'        => in_array( $name, array( 'core/button', 'core/navigation-link' ), true ) ? array( ':hover', ':focus', ':focus-visible', ':active' ) : array(),
				'thirdPartyAdapter'         => is_array( $adapter ),
				'adapterAttributeAllowlist' => is_array( $adapter ) ? (array) ( $adapter['attributeAllowlist'] ?? array() ) : array(),
			),
		);
		if ( is_array( $adapter ) && isset( $adapter['transformContract'] ) && is_callable( $adapter['transformContract'] ) ) {
			$transformed = call_user_func( $adapter['transformContract'], $contract );
			if ( is_array( $transformed ) ) {
				$contract = $transformed;
			}
		}
		return $contract;
	}

	public function catalog(): array {
		$this->ensure_adapters();
		$out = array();
		foreach ( \WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			$out[] = array(
				'name'              => (string) $name,
				'title'             => (string) $type->title,
				'aiAuthorable'      => $this->is_ai_authorable( (string) $name ),
				'thirdPartyAdapter' => isset( $this->adapters[ (string) $name ] ),
			);
		}
		return $out;
	}

	public function selection( string $task, array $existing_names, string $mode = 'focused' ): array {
		$names = array_values( array_unique( array_filter( array_map( 'strval', $existing_names ) ) ) );
		$text  = strtolower( $task );
		if ( 'full' === $mode ) {
			$names = array_merge( $names, self::DEFAULT_ALLOWED, array_keys( array_filter( $this->adapters(), static fn( array $item ): bool => ! empty( $item['aiAuthorable'] ) ) ) );
		} elseif ( 'expanded' === $mode || preg_match( '/redesign|create|hero|landing|gallery|video|tabs|accordion|thiết kế|tạo|hình ảnh|video/u', $text ) ) {
			$names = array_merge(
				$names,
				array(
					'core/group', 'core/heading', 'core/paragraph', 'core/buttons', 'core/button', 'core/image', 'core/cover', 'core/columns', 'core/column',
					'core/accordion', 'core/accordion-item', 'core/accordion-heading', 'core/accordion-panel',
					'core/tabs', 'core/tab-list', 'core/tab-panels', 'core/tab-panel',
				)
			);
		}
		$out = array();
		foreach ( array_values( array_unique( $names ) ) as $name ) {
			$contract = $this->contract( $name );
			if ( $contract && ! empty( $contract['nodera']['aiAuthorable'] ) ) {
				$out[] = $contract;
			}
		}
		return $out;
	}

	public function validate_attributes( string $name, array $attributes ): array {
		$contract = $this->contract( $name );
		if ( ! $contract ) {
			return array( 'valid' => false, 'code' => 'nodera_ai_unknown_block', 'message' => 'Block type is not registered.' );
		}
		$schema = $contract['attributes'];
		foreach ( $attributes as $key => $value ) {
			if ( ! array_key_exists( $key, $schema ) ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_unknown_attribute', 'path' => 'attributes.' . $key, 'message' => 'Attribute is not registered for this block or its Nodera adapter.' );
			}
			$type = $schema[ $key ]['type'] ?? null;
			if ( $type && ! $this->matches_type( $value, $type ) ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_invalid_attribute_type', 'path' => 'attributes.' . $key, 'message' => 'Attribute type does not match the registered block schema.' );
			}
		}
		if ( isset( $attributes['style'] ) ) {
			$style = $this->validate_style( $name, $attributes['style'] );
			if ( ! $style['valid'] ) {
				return $style;
			}
		}
		$adapter = $this->adapters[ $name ] ?? null;
		if ( is_array( $adapter ) && isset( $adapter['validateAttributes'] ) && is_callable( $adapter['validateAttributes'] ) ) {
			$custom = call_user_func( $adapter['validateAttributes'], $attributes, $contract );
			if ( false === $custom ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_adapter_validation_failed', 'message' => 'Third-party block adapter rejected the attributes.' );
			}
			if ( is_array( $custom ) && isset( $custom['valid'] ) && ! $custom['valid'] ) {
				return $custom;
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

	private function validate_style( string $name, mixed $style ): array {
		if ( ! is_array( $style ) || array_is_list( $style ) ) {
			return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style', 'path' => 'attributes.style', 'message' => 'Style must be an object.' );
		}
		$pseudo = array( ':hover', ':focus', ':focus-visible', ':active' );
		foreach ( array_keys( $style ) as $key ) {
			if ( is_string( $key ) && str_starts_with( $key, '@' ) && ! in_array( $key, array( '@mobile', '@tablet' ), true ) ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_state', 'path' => 'attributes.style.' . $key, 'message' => 'Unsupported responsive style state.' );
			}
			if ( is_string( $key ) && str_starts_with( $key, ':' ) && ( ! in_array( $key, $pseudo, true ) || ! in_array( $name, array( 'core/button', 'core/navigation-link' ), true ) ) ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_state', 'path' => 'attributes.style.' . $key, 'message' => 'Pseudo state is not supported by this Core block.' );
			}
		}
		return $this->validate_style_values( $style, 'attributes.style', 0 );
	}

	private function validate_style_values( array $value, string $path, int $depth ): array {
		if ( $depth > 10 ) {
			return array( 'valid' => false, 'code' => 'nodera_ai_style_too_deep', 'path' => $path, 'message' => 'Style nesting is too deep.' );
		}
		foreach ( $value as $key => $item ) {
			$next = $path . '.' . (string) $key;
			if ( is_array( $item ) ) {
				$result = $this->validate_style_values( $item, $next, $depth + 1 );
				if ( ! $result['valid'] ) {
					return $result;
				}
			} elseif ( is_string( $item ) ) {
				if ( strlen( $item ) > 240 || preg_match( '/[{};<>]/', $item ) || false !== stripos( $item, 'url(' ) || false !== stripos( $item, 'expression(' ) ) {
					return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_value', 'path' => $next, 'message' => 'Style value is outside the safe grammar.' );
				}
			} elseif ( ! is_scalar( $item ) && null !== $item ) {
				return array( 'valid' => false, 'code' => 'nodera_ai_invalid_style_value', 'path' => $next, 'message' => 'Style value is invalid.' );
			}
		}
		return array( 'valid' => true );
	}

	private function matches_type( mixed $value, string|array $type ): bool {
		foreach ( (array) $type as $candidate ) {
			$valid = match ( $candidate ) {
				'string'  => is_string( $value ),
				'boolean' => is_bool( $value ),
				'integer' => is_int( $value ),
				'number'  => is_int( $value ) || is_float( $value ),
				'array'   => is_array( $value ) && array_is_list( $value ),
				'object'  => is_array( $value ) && ! array_is_list( $value ),
				'null'    => null === $value,
				default   => true,
			};
			if ( $valid ) {
				return true;
			}
		}
		return false;
	}

	private function ensure_adapters(): void {
		if ( ! $this->adapters_collected && did_action( 'init' ) ) {
			$this->collect_adapters();
		}
	}
}
