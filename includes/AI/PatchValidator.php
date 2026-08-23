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
	public const SCHEMA         = 'nodera-patch/v1';
	private const MAX_OPERATIONS = 200;
	private const MAX_BYTES      = 524288;

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
		$target_unknown = array_diff( array_keys( $patch['target'] ), array( 'kind', 'stableIds', 'fingerprint' ) );
		if ( $target_unknown ) {
			return $this->error( 'nodera_ai_unknown_target_field', 'Patch target contains an unknown field.', 400 );
		}
		$expected = TargetFingerprint::hash( $current_blocks );
		$actual   = $patch['target']['fingerprint'] ?? '';
		if ( ! is_string( $actual ) || ! hash_equals( $expected, $actual ) ) {
			return $this->error( 'nodera_ai_target_changed', 'Target changed since this AI task was exported.', 409, array( 'expectedFingerprint' => $expected ) );
		}
		$operations = $patch['operations'] ?? null;
		if ( ! is_array( $operations ) || count( $operations ) > self::MAX_OPERATIONS ) {
			return $this->error( 'nodera_ai_invalid_operations', 'Patch operations are invalid or exceed the limit.', 400 );
		}
		$editable = array_fill_keys( array_values( array_unique( array_filter( $editable_ids, array( StableBlockId::class, 'is_valid' ) ) ) ), true );
		foreach ( $operations as $index => $operation ) {
			$result = $this->validate_operation( $operation, (int) $index, $current_blocks, $editable );
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

	private function validate_operation( mixed $operation, int $index, array $current_blocks, array $editable ): bool|WP_Error {
		if ( ! is_array( $operation ) ) {
			return $this->error( 'nodera_ai_invalid_operation', 'Operation must be an object.', 400, array( 'operationIndex' => $index ) );
		}
		$op      = (string) ( $operation['op'] ?? '' );
		$schemas = array(
			'updateAttributes'  => array( 'op', 'stableId', 'attributes' ),
			'insertBlock'       => array( 'op', 'parentStableId', 'index', 'block' ),
			'removeBlock'       => array( 'op', 'stableId' ),
			'moveBlock'         => array( 'op', 'stableId', 'toParentStableId', 'index' ),
			'replaceBlock'      => array( 'op', 'stableId', 'block' ),
			'replaceInnerBlocks'=> array( 'op', 'stableId', 'blocks' ),
		);
		if ( ! isset( $schemas[ $op ] ) ) {
			return $this->error( 'nodera_ai_unknown_operation', 'Unknown AI operation.', 400, array( 'operationIndex' => $index ) );
		}
		$unknown = array_diff( array_keys( $operation ), $schemas[ $op ] );
		if ( $unknown ) {
			return $this->error( 'nodera_ai_unknown_operation_field', 'Operation contains an unknown field.', 400, array( 'operationIndex' => $index, 'path' => (string) reset( $unknown ) ) );
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
		}

		if ( isset( $operation['stableId'] ) && ! CandidateTree::find( $current_blocks, (string) $operation['stableId'] ) ) {
			return $this->error( 'nodera_ai_unknown_target_block', 'Operation references a block that does not exist.', 400, array( 'operationIndex' => $index ) );
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
			$next = array_merge( $ancestors, array( $name ) );
			$result = $this->validate_tree( (array) ( $block['innerBlocks'] ?? array() ), $name, $next );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		return true;
	}

	private function error( string $code, string $message, int $status, array $data = array() ): WP_Error {
		$data['status'] = $status;
		return new WP_Error( $code, $message, $data );
	}
}
