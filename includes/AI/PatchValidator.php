<?php
/**
 * Strict Nodera AI patch validation.
 *
 * @package Nodera
 */

namespace Nodera\AI;

use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use WP_Error;

/**
 * Treats every AI result as untrusted input.
 */
final class PatchValidator {
	public const SCHEMA          = 'nodera-patch/v1';
	private const MAX_OPERATIONS = 200;
	private const MAX_BYTES      = 524288;
	private const META_KEY       = 'nodera_dynamic_text';
	private const RESPONSIVE_PROPERTIES = array(
		'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
		'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
		'gap', 'width', 'minWidth', 'maxWidth', 'fontSize', 'lineHeight',
		'flexDirection', 'flexWrap', 'justifyContent', 'alignItems',
		'display', 'borderRadius', 'opacity',
	);

	public function __construct( private BlockContractRegistry $contracts ) {}

	/**
	 * Validate and construct a candidate tree.
	 *
	 * @return array|WP_Error
	 */
	public function validate( array $patch, array $current_blocks, array $editable_ids ): array|WP_Error {
		if ( strlen( (string) wp_json_encode( $patch ) ) > self::MAX_BYTES ) {
			return $this->error( 'nodera_ai_payload_too_large', 'Patch exceeds the maximum payload size.', 413 );
		}
		$unknown = array_diff( array_keys( $patch ), array( 'schema', 'target', 'operations' ) );
		if ( $unknown ) {
			return $this->error( 'nodera_ai_unknown_field', 'Patch contains unknown top-level fields.', 400, array( 'path' => (string) reset( $unknown ) ) );
		}
		if ( self::SCHEMA !== ( $patch['schema'] ?? null ) ) {
			return $this->error( 'nodera_ai_invalid_schema', 'Expected nodera-patch/v1.', 400 );
		}
		if ( ! is_array( $patch['target'] ?? null ) ) {
			return $this->error( 'nodera_ai_invalid_target', 'Patch target is required.', 400 );
		}
		$target = $patch['target'];
		$target_unknown = array_diff( array_keys( $target ), array( 'kind', 'stableIds', 'fingerprint' ) );
		if ( $target_unknown ) {
			return $this->error( 'nodera_ai_unknown_target_field', 'Patch target contains an unknown field.', 400, array( 'path' => (string) reset( $target_unknown ) ) );
		}
		$kind = (string) ( $target['kind'] ?? '' );
		if ( ! in_array( $kind, array( 'block', 'subtree', 'selection', 'page' ), true ) ) {
			return $this->error( 'nodera_ai_invalid_target_kind', 'Patch target kind is invalid.', 400 );
		}
		if ( ! is_array( $target['stableIds'] ?? null ) ) {
			return $this->error( 'nodera_ai_invalid_target_ids', 'Patch target stableIds must be an array.', 400 );
		}

		$editable_ids = array_values( array_unique( array_filter( $editable_ids, array( StableBlockId::class, 'is_valid' ) ) ) );
		$target_ids   = array_values( array_unique( array_filter( $target['stableIds'], array( StableBlockId::class, 'is_valid' ) ) ) );
		if ( count( $target_ids ) !== count( $target['stableIds'] ) ) {
			return $this->error( 'nodera_ai_invalid_target_ids', 'Patch target contains invalid or duplicate stable IDs.', 400 );
		}
		$expected_ids = $editable_ids;
		sort( $expected_ids );
		sort( $target_ids );
		if ( $expected_ids !== $target_ids ) {
			return $this->error( 'nodera_ai_target_scope_mismatch', 'Patch target does not match the exported editable scope.', 409 );
		}

		$expected = TargetFingerprint::hash( $current_blocks );
		$actual   = $target['fingerprint'] ?? '';
		if ( ! is_string( $actual ) || ! hash_equals( $expected, $actual ) ) {
			return $this->error( 'nodera_ai_target_changed', 'Target changed since this AI task was exported.', 409, array( 'expectedFingerprint' => $expected ) );
		}
		$operations = $patch['operations'] ?? null;
		if ( ! is_array( $operations ) || count( $operations ) > self::MAX_OPERATIONS ) {
			return $this->error( 'nodera_ai_invalid_operations', 'Patch operations are invalid or exceed the limit.', 400 );
		}
		$editable = array_fill_keys( $editable_ids, true );
		foreach ( $operations as $index => $operation ) {
			$result = $this->validate_operation( $operation, (int) $index, $current_blocks, $editable, $kind );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}

		$candidate = CandidateTree::apply( $current_blocks, $operations );
		$ids       = CandidateTree::ids( $candidate );
		if ( count( $ids ) !== count( array_unique( $ids ) ) ) {
			return $this->error( 'nodera_ai_duplicate_id', 'Candidate contains duplicate persistent block IDs.', 400 );
		}
		$structure = $this->validate_tree( $candidate );
		if ( is_wp_error( $structure ) ) {
			return $structure;
		}
		return array(
			'valid'          => true,
			'operationCount' => count( $operations ),
			'candidate'      => $candidate,
		);
	}

	/**
	 * Validate one operation before candidate construction.
	 */
	private function validate_operation( mixed $operation, int $index, array $current_blocks, array $editable, string $target_kind ): bool|WP_Error {
		if ( ! is_array( $operation ) ) {
			return $this->error( 'nodera_ai_invalid_operation', 'Operation must be an object.', 400, array( 'operationIndex' => $index ) );
		}
		$op      = (string) ( $operation['op'] ?? '' );
		$schemas = array(
			'updateAttributes'   => array( 'op', 'stableId', 'attributes' ),
			'insertBlock'        => array( 'op', 'parentStableId', 'index', 'block' ),
			'removeBlock'        => array( 'op', 'stableId' ),
			'moveBlock'          => array( 'op', 'stableId', 'toParentStableId', 'index' ),
			'replaceBlock'       => array( 'op', 'stableId', 'block' ),
			'replaceInnerBlocks' => array( 'op', 'stableId', 'blocks' ),
		);
		if ( ! isset( $schemas[ $op ] ) ) {
			return $this->error( 'nodera_ai_unknown_operation', 'Unknown AI operation.', 400, array( 'operationIndex' => $index ) );
		}
		$unknown = array_diff( array_keys( $operation ), $schemas[ $op ] );
		if ( $unknown ) {
			return $this->error( 'nodera_ai_unknown_operation_field', 'Operation contains an unknown field.', 400, array( 'operationIndex' => $index, 'path' => (string) reset( $unknown ) ) );
		}
		if ( isset( $operation['index'] ) && ( ! is_int( $operation['index'] ) || $operation['index'] < 0 ) ) {
			return $this->error( 'nodera_ai_invalid_index', 'Operation index must be a non-negative integer.', 400, array( 'operationIndex' => $index, 'path' => 'index' ) );
		}

		foreach ( array( 'stableId', 'parentStableId', 'toParentStableId' ) as $field ) {
			if ( ! array_key_exists( $field, $operation ) || null === $operation[ $field ] || '' === $operation[ $field ] ) {
				continue;
			}
			$id = $operation[ $field ];
			if ( ! StableBlockId::is_valid( $id ) ) {
				return $this->error( 'nodera_ai_invalid_stable_id', 'Operation contains an invalid stable ID.', 400, array( 'operationIndex' => $index, 'path' => $field ) );
			}
			if ( ! isset( $editable[ $id ] ) ) {
				return $this->error( 'nodera_ai_scope_escape', 'Operation targets a block outside the editable scope.', 403, array( 'operationIndex' => $index, 'stableId' => $id ) );
			}
			if ( in_array( $field, array( 'parentStableId', 'toParentStableId' ), true ) && ! CandidateTree::find( $current_blocks, $id ) ) {
				return $this->error( 'nodera_ai_unknown_parent', 'Operation references a parent block that does not exist.', 400, array( 'operationIndex' => $index, 'stableId' => $id ) );
			}
		}

		if ( in_array( $op, array( 'insertBlock', 'moveBlock' ), true ) && 'page' !== $target_kind ) {
			$parent_field = 'insertBlock' === $op ? 'parentStableId' : 'toParentStableId';
			if ( empty( $operation[ $parent_field ] ) ) {
				return $this->error( 'nodera_ai_scope_escape', 'Scoped tasks may not insert or move blocks to the document root.', 403, array( 'operationIndex' => $index, 'path' => $parent_field ) );
			}
		}

		if ( isset( $operation['stableId'] ) && ! CandidateTree::find( $current_blocks, (string) $operation['stableId'] ) ) {
			return $this->error( 'nodera_ai_unknown_target_block', 'Operation references a block that does not exist.', 400, array( 'operationIndex' => $index ) );
		}
		if ( 'moveBlock' === $op && ! empty( $operation['toParentStableId'] ) ) {
			$source = CandidateTree::find( $current_blocks, (string) $operation['stableId'] );
			if ( $source && in_array( (string) $operation['toParentStableId'], CandidateTree::ids( array( $source ) ), true ) ) {
				return $this->error( 'nodera_ai_invalid_move', 'A block cannot be moved inside itself or one of its descendants.', 400, array( 'operationIndex' => $index ) );
			}
		}
		if ( isset( $operation['attributes'] ) ) {
			if ( ! is_array( $operation['attributes'] ) ) {
				return $this->error( 'nodera_ai_invalid_attributes', 'Operation attributes must be an object.', 400, array( 'operationIndex' => $index ) );
			}
			$current = CandidateTree::find( $current_blocks, (string) $operation['stableId'] );
			$check   = $this->contracts->validate_attributes( (string) $current['name'], (array) $operation['attributes'] );
			if ( ! $check['valid'] ) {
				return $this->error( (string) $check['code'], (string) $check['message'], 400, array( 'operationIndex' => $index, 'path' => $check['path'] ?? '' ) );
			}
			$special = $this->validate_special_attributes( (array) $operation['attributes'] );
			if ( is_wp_error( $special ) ) {
				return $this->with_operation( $special, $index );
			}
		}
		if ( isset( $operation['block'] ) ) {
			$check = $this->validate_block_spec( $operation['block'], $index );
			if ( is_wp_error( $check ) ) {
				return $check;
			}
		}
		if ( isset( $operation['blocks'] ) ) {
			if ( ! is_array( $operation['blocks'] ) ) {
				return $this->error( 'nodera_ai_invalid_blocks', 'Replacement children must be an array.', 400, array( 'operationIndex' => $index ) );
			}
			foreach ( $operation['blocks'] as $block ) {
				$check = $this->validate_block_spec( $block, $index );
				if ( is_wp_error( $check ) ) {
					return $check;
				}
			}
		}
		return true;
	}

	/**
	 * Validate an AI-created block recursively.
	 */
	private function validate_block_spec( mixed $block, int $index ): bool|WP_Error {
		if ( ! is_array( $block ) ) {
			return $this->error( 'nodera_ai_invalid_block', 'Block specification must be an object.', 400, array( 'operationIndex' => $index ) );
		}
		$unknown = array_diff( array_keys( $block ), array( 'name', 'attributes', 'innerBlocks' ) );
		if ( $unknown ) {
			return $this->error( 'nodera_ai_unknown_block_field', 'Block specification contains an unknown field.', 400, array( 'operationIndex' => $index ) );
		}
		$name = (string) ( $block['name'] ?? '' );
		if ( ! $this->contracts->contract( $name ) ) {
			return $this->error( 'nodera_ai_unknown_block', 'AI attempted to create an unregistered block.', 400, array( 'operationIndex' => $index, 'blockName' => $name ) );
		}
		if ( ! $this->contracts->is_ai_authorable( $name ) ) {
			return $this->error( 'nodera_ai_block_not_allowed', 'AI is not allowed to author this block type.', 400, array( 'operationIndex' => $index, 'blockName' => $name ) );
		}
		$attributes = (array) ( $block['attributes'] ?? array() );
		$check      = $this->contracts->validate_attributes( $name, $attributes );
		if ( ! $check['valid'] ) {
			return $this->error( (string) $check['code'], (string) $check['message'], 400, array( 'operationIndex' => $index, 'path' => $check['path'] ?? '' ) );
		}
		$special = $this->validate_special_attributes( $attributes );
		if ( is_wp_error( $special ) ) {
			return $this->with_operation( $special, $index );
		}
		$id = $attributes['noderaId'] ?? '';
		if ( ! StableBlockId::is_valid( $id ) ) {
			return $this->error( 'nodera_ai_invalid_stable_id', 'Every AI-authored block must include a valid noderaId.', 400, array( 'operationIndex' => $index, 'blockName' => $name ) );
		}
		foreach ( (array) ( $block['innerBlocks'] ?? array() ) as $child ) {
			$result = $this->validate_block_spec( $child, $index );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		return true;
	}

	/**
	 * Validate candidate relationships against live block contracts.
	 */
	private function validate_tree( array $blocks, ?string $parent = null, array $ancestors = array() ): bool|WP_Error {
		foreach ( $blocks as $block ) {
			$name  = (string) ( $block['name'] ?? '' );
			$attrs = (array) ( $block['attributes'] ?? array() );
			$check = $this->contracts->validate_attributes( $name, $attrs );
			if ( ! $check['valid'] ) {
				return $this->error( (string) $check['code'], (string) $check['message'], 400, array( 'path' => $check['path'] ?? '' ) );
			}
			$relationship = $this->contracts->validate_relationship( $name, $parent, $ancestors );
			if ( ! $relationship['valid'] ) {
				return $this->error( 'nodera_ai_invalid_relationship', (string) $relationship['message'], 400, array( 'blockName' => $name ) );
			}
			$next   = array_merge( $ancestors, array( $name ) );
			$result = $this->validate_tree( (array) ( $block['innerBlocks'] ?? array() ), $name, $next );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		return true;
	}

	/**
	 * Validate URL-like, Nodera style and Block Bindings attributes provided by AI.
	 */
	private function validate_special_attributes( array $attributes ): bool|WP_Error {
		foreach ( array( 'url', 'href', 'src' ) as $key ) {
			if ( isset( $attributes[ $key ] ) && is_string( $attributes[ $key ] ) && ! $this->is_safe_url( $attributes[ $key ] ) ) {
				return $this->error( 'nodera_ai_unsafe_url', 'AI attribute contains an unsafe URL scheme.', 400, array( 'path' => 'attributes.' . $key ) );
			}
		}
		if ( isset( $attributes['noderaResponsive'] ) ) {
			$result = $this->validate_responsive_map( $attributes['noderaResponsive'], array( 'tablet', 'mobile' ), 'attributes.noderaResponsive' );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		if ( isset( $attributes['noderaStateStyles'] ) ) {
			$result = $this->validate_responsive_map( $attributes['noderaStateStyles'], array( 'hover', 'focus', 'active' ), 'attributes.noderaStateStyles' );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		if ( isset( $attributes['noderaCustomCSS'] ) && ! $this->is_safe_custom_css( $attributes['noderaCustomCSS'] ) ) {
			return $this->error( 'nodera_ai_invalid_custom_css', 'Scoped Custom CSS is outside the supported safe grammar.', 400, array( 'path' => 'attributes.noderaCustomCSS' ) );
		}
		if ( isset( $attributes['metadata'] ) ) {
			$result = $this->validate_bindings( $attributes['metadata'] );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		return true;
	}

	/**
	 * Validate responsive/state maps against the compiler allowlist.
	 */
	private function validate_responsive_map( mixed $map, array $allowed_groups, string $path ): bool|WP_Error {
		if ( ! is_array( $map ) || array_is_list( $map ) ) {
			return $this->error( 'nodera_ai_invalid_responsive', 'Responsive/state data must be an object.', 400, array( 'path' => $path ) );
		}
		foreach ( $map as $group => $properties ) {
			if ( ! in_array( $group, $allowed_groups, true ) || ! is_array( $properties ) || array_is_list( $properties ) ) {
				return $this->error( 'nodera_ai_invalid_responsive', 'Responsive/state group is not supported.', 400, array( 'path' => $path . '.' . $group ) );
			}
			foreach ( $properties as $property => $value ) {
				if ( ! in_array( $property, self::RESPONSIVE_PROPERTIES, true ) || ! is_scalar( $value ) ) {
					return $this->error( 'nodera_ai_invalid_responsive_property', 'Responsive/state property is not supported.', 400, array( 'path' => $path . '.' . $group . '.' . $property ) );
				}
				$value = trim( (string) $value );
				if ( strlen( $value ) > 80 || preg_match( '/[{};<>]/', $value ) ) {
					return $this->error( 'nodera_ai_invalid_responsive_value', 'Responsive/state value is invalid.', 400, array( 'path' => $path . '.' . $group . '.' . $property ) );
				}
				if ( 'flexDirection' === $property && '' !== $value && ! in_array( $value, array( 'row', 'column', 'row-reverse', 'column-reverse' ), true ) ) {
					return $this->error( 'nodera_ai_invalid_responsive_value', 'Unsupported flex direction.', 400, array( 'path' => $path . '.' . $group . '.' . $property ) );
				}
				if ( 'flexWrap' === $property && '' !== $value && ! in_array( $value, array( 'nowrap', 'wrap', 'wrap-reverse' ), true ) ) {
					return $this->error( 'nodera_ai_invalid_responsive_value', 'Unsupported flex wrap value.', 400, array( 'path' => $path . '.' . $group . '.' . $property ) );
				}
			}
		}
		return true;
	}

	/**
	 * Restrict AI-created bindings to the safe built-in post-meta source.
	 */
	private function validate_bindings( mixed $metadata ): bool|WP_Error {
		if ( ! is_array( $metadata ) || array_is_list( $metadata ) ) {
			return $this->error( 'nodera_ai_invalid_metadata', 'Block metadata must be an object.', 400, array( 'path' => 'attributes.metadata' ) );
		}
		if ( ! isset( $metadata['bindings'] ) ) {
			return true;
		}
		if ( ! is_array( $metadata['bindings'] ) || array_is_list( $metadata['bindings'] ) ) {
			return $this->error( 'nodera_ai_invalid_bindings', 'Block bindings must be an object.', 400, array( 'path' => 'attributes.metadata.bindings' ) );
		}
		foreach ( $metadata['bindings'] as $attribute => $binding ) {
			if ( ! is_string( $attribute ) || ! is_array( $binding ) || array_is_list( $binding ) ) {
				return $this->error( 'nodera_ai_invalid_binding', 'Binding declaration is invalid.', 400, array( 'path' => 'attributes.metadata.bindings' ) );
			}
			$unknown = array_diff( array_keys( $binding ), array( 'source', 'args' ) );
			$args    = $binding['args'] ?? null;
			if ( $unknown || 'core/post-meta' !== ( $binding['source'] ?? null ) || ! is_array( $args ) || array_keys( $args ) !== array( 'key' ) || self::META_KEY !== ( $args['key'] ?? null ) ) {
				return $this->error( 'nodera_ai_binding_not_allowed', 'AI binding is outside the registered safe source/key allowlist.', 400, array( 'path' => 'attributes.metadata.bindings.' . $attribute ) );
			}
		}
		return true;
	}

	/**
	 * Accept relative/fragment URLs and a narrow scheme allowlist.
	 */
	private function is_safe_url( string $url ): bool {
		$url = trim( $url );
		if ( '' === $url || str_starts_with( $url, '/' ) || str_starts_with( $url, '#' ) || str_starts_with( $url, '?' ) ) {
			return true;
		}
		$scheme = strtolower( (string) parse_url( $url, PHP_URL_SCHEME ) );
		return in_array( $scheme, array( 'http', 'https', 'mailto', 'tel' ), true );
	}

	/**
	 * Validate the same deliberately small Custom CSS grammar used by the runtime compiler.
	 */
	private function is_safe_custom_css( mixed $css ): bool {
		if ( ! is_string( $css ) ) {
			return false;
		}
		$css = trim( $css );
		if ( '' === $css ) {
			return true;
		}
		if ( strlen( $css ) > 8000 || false !== stripos( $css, '@import' ) || false !== stripos( $css, 'url(' ) ) {
			return false;
		}
		if ( preg_match_all( '/(&(?::(?:hover|focus|active))?)\s*\{([^{}]*)\}/', $css, $matches, PREG_SET_ORDER ) < 1 ) {
			return false;
		}
		foreach ( $matches as $match ) {
			if ( '' === trim( $match[2] ) || preg_match( '/[<>@]/', $match[2] ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Preserve structured error data while attaching an operation index.
	 */
	private function with_operation( WP_Error $error, int $index ): WP_Error {
		$data                   = (array) $error->get_error_data();
		$data['operationIndex'] = $index;
		return new WP_Error( $error->get_error_code(), $error->get_error_message(), $data );
	}

	private function error( string $code, string $message, int $status, array $data = array() ): WP_Error {
		$data['status'] = $status;
		return new WP_Error( $code, $message, $data );
	}
}
