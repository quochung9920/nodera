<?php
namespace Nodera\AI;

use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use WP_Error;

final class PatchValidator {
	public const SCHEMA = 'nodera-patch/v1';
	private const MAX_OPERATIONS = 200;

	public function __construct( private BlockContractRegistry $contracts ) {}

	public function validate( array $patch, array $current_blocks, array $editable_ids ): array|WP_Error {
		if ( self::SCHEMA !== ( $patch['schema'] ?? null ) ) {
			return new WP_Error( 'nodera_ai_invalid_schema', 'Expected nodera-patch/v1.', [ 'status' => 400 ] );
		}
		$expected = TargetFingerprint::hash( $current_blocks );
		$actual   = $patch['target']['fingerprint'] ?? '';
		if ( ! is_string( $actual ) || ! hash_equals( $expected, $actual ) ) {
			return new WP_Error( 'nodera_ai_target_changed', 'Target changed since this AI task was exported.', [ 'status' => 409, 'expectedFingerprint' => $expected ] );
		}
		$operations = $patch['operations'] ?? null;
		if ( ! is_array( $operations ) || count( $operations ) > self::MAX_OPERATIONS ) {
			return new WP_Error( 'nodera_ai_invalid_operations', 'Patch operations are invalid or exceed the limit.', [ 'status' => 400 ] );
		}
		$allowed_ops = [ 'updateAttributes', 'insertBlock', 'removeBlock', 'moveBlock', 'replaceBlock', 'replaceInnerBlocks' ];
		$editable = array_fill_keys( $editable_ids, true );
		foreach ( $operations as $index => $op ) {
			if ( ! is_array( $op ) || ! in_array( $op['op'] ?? '', $allowed_ops, true ) ) {
				return new WP_Error( 'nodera_ai_unknown_operation', 'Unknown AI operation.', [ 'status' => 400, 'operationIndex' => $index ] );
			}
			$id = $op['stableId'] ?? ( $op['parentStableId'] ?? null );
			if ( $id && ( ! StableBlockId::is_valid( $id ) || ! isset( $editable[ $id ] ) ) ) {
				return new WP_Error( 'nodera_ai_scope_escape', 'Operation targets a block outside the editable scope.', [ 'status' => 403, 'operationIndex' => $index, 'stableId' => $id ] );
			}
			if ( isset( $op['block']['name'] ) && ! $this->contracts->is_ai_authorable( (string) $op['block']['name'] ) ) {
				return new WP_Error( 'nodera_ai_block_not_allowed', 'AI is not allowed to author this block type.', [ 'status' => 400, 'operationIndex' => $index, 'blockName' => $op['block']['name'] ] );
			}
		}
		return [ 'valid' => true, 'operationCount' => count( $operations ) ];
	}
}
