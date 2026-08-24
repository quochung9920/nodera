<?php
/**
 * Sanitizes exported AI context before it leaves WordPress.
 *
 * @package Nodera
 */

namespace Nodera\AI;

use Nodera\Contracts\BlockContractRegistry;

final class ContextSanitizer {
	private const MAX_DEPTH = 12;
	private const MAX_BLOCKS = 300;
	private const MAX_STRING = 20000;
	private int $block_count = 0;

	public function __construct( private BlockContractRegistry $contracts ) {}

	public function sanitize( array $context ): array {
		$allowed = array( 'schema', 'task', 'target', 'document', 'context', 'contracts', 'design', 'visualFacts', 'environment', 'limits', 'output' );
		$out = array_intersect_key( $context, array_flip( $allowed ) );
		if ( isset( $out['document']['scopeTree'] ) && is_array( $out['document']['scopeTree'] ) ) {
			$out['document']['scopeTree'] = $this->blocks( $out['document']['scopeTree'] );
		}
		foreach ( array( 'ancestors', 'siblings' ) as $key ) {
			if ( isset( $out['context'][ $key ] ) && is_array( $out['context'][ $key ] ) ) {
				$out['context'][ $key ] = $this->blocks( $out['context'][ $key ] );
			}
		}
		return $this->walk( $out, 0 );
	}

	private function blocks( array $blocks ): array {
		$out = array();
		foreach ( $blocks as $block ) {
			if ( ++$this->block_count > self::MAX_BLOCKS || ! is_array( $block ) ) {
				break;
			}
			$name = is_string( $block['name'] ?? null ) ? $block['name'] : '';
			$attrs = is_array( $block['attributes'] ?? null ) ? $block['attributes'] : array();
			$contract = $this->contracts->contract( $name );
			if ( $contract && is_array( $contract['attributes'] ?? null ) ) {
				$attrs = array_intersect_key( $attrs, $contract['attributes'] );
			} else {
				$attrs = array_intersect_key( $attrs, array_flip( array( 'noderaId', 'className', 'anchor' ) ) );
			}
			$out[] = array(
				'name' => $name,
				'attributes' => $this->walk( $attrs, 1 ),
				'innerBlocks' => $this->blocks( is_array( $block['innerBlocks'] ?? null ) ? $block['innerBlocks'] : array() ),
			);
		}
		return $out;
	}

	private function walk( mixed $value, int $depth ): mixed {
		if ( $depth > self::MAX_DEPTH ) {
			return null;
		}
		if ( is_string( $value ) ) {
			return mb_substr( $value, 0, self::MAX_STRING );
		}
		if ( ! is_array( $value ) ) {
			return is_scalar( $value ) || null === $value ? $value : null;
		}
		$out = array();
		$count = 0;
		foreach ( $value as $key => $item ) {
			if ( ++$count > 500 ) {
				break;
			}
			$name = is_string( $key ) ? strtolower( $key ) : '';
			if ( $name && preg_match( '/(?:api[_-]?key|password|passwd|secret|authorization|cookie|nonce|access[_-]?token|refresh[_-]?token)/', $name ) ) {
				$out[ $key ] = '[redacted]';
				continue;
			}
			$out[ $key ] = $this->walk( $item, $depth + 1 );
		}
		return $out;
	}
}
