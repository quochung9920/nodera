<?php
/**
 * In-memory AI patch candidate tree.
 *
 * @package Nodera
 */

namespace Nodera\AI;

/**
 * Applies Nodera patch operations to plain block arrays without mutating Gutenberg.
 */
final class CandidateTree {
	/**
	 * Apply operations and return the candidate block tree.
	 */
	public static function apply( array $blocks, array $operations ): array {
		$candidate = $blocks;
		foreach ( $operations as $operation ) {
			$op = $operation['op'];
			switch ( $op ) {
				case 'updateAttributes':
					$candidate = self::map_block(
						$candidate,
						(string) $operation['stableId'],
						static function ( array $block ) use ( $operation ): array {
							$block['attributes'] = array_replace( (array) ( $block['attributes'] ?? array() ), (array) $operation['attributes'] );
							return $block;
						}
					);
					break;
				case 'removeBlock':
					$candidate = self::remove_block( $candidate, (string) $operation['stableId'] );
					break;
				case 'replaceBlock':
					$candidate = self::map_block( $candidate, (string) $operation['stableId'], static fn() => $operation['block'] );
					break;
				case 'replaceInnerBlocks':
					$candidate = self::map_block(
						$candidate,
						(string) $operation['stableId'],
						static function ( array $block ) use ( $operation ): array {
							$block['innerBlocks'] = array_values( (array) $operation['blocks'] );
							return $block;
						}
					);
					break;
				case 'insertBlock':
					$candidate = self::insert_block( $candidate, $operation['parentStableId'] ?? null, (array) $operation['block'], (int) ( $operation['index'] ?? PHP_INT_MAX ) );
					break;
				case 'moveBlock':
					$moved = null;
					$candidate = self::extract_block( $candidate, (string) $operation['stableId'], $moved );
					if ( $moved ) {
						$candidate = self::insert_block( $candidate, $operation['toParentStableId'] ?? null, $moved, (int) ( $operation['index'] ?? PHP_INT_MAX ) );
					}
					break;
			}
		}
		return array_values( $candidate );
	}

	/**
	 * Find a node by persistent ID.
	 */
	public static function find( array $blocks, string $id ): ?array {
		foreach ( $blocks as $block ) {
			if ( self::id( $block ) === $id ) {
				return $block;
			}
			$found = self::find( (array) ( $block['innerBlocks'] ?? array() ), $id );
			if ( $found ) {
				return $found;
			}
		}
		return null;
	}

	/**
	 * Collect IDs recursively.
	 */
	public static function ids( array $blocks ): array {
		$ids = array();
		foreach ( $blocks as $block ) {
			$id = self::id( $block );
			if ( $id ) {
				$ids[] = $id;
			}
			$ids = array_merge( $ids, self::ids( (array) ( $block['innerBlocks'] ?? array() ) ) );
		}
		return $ids;
	}

	private static function id( array $block ): ?string {
		$id = $block['attributes']['noderaId'] ?? null;
		return is_string( $id ) ? $id : null;
	}

	private static function map_block( array $blocks, string $id, callable $callback ): array {
		foreach ( $blocks as $index => $block ) {
			if ( self::id( $block ) === $id ) {
				$blocks[ $index ] = $callback( $block );
				continue;
			}
			$block['innerBlocks'] = self::map_block( (array) ( $block['innerBlocks'] ?? array() ), $id, $callback );
			$blocks[ $index ]     = $block;
		}
		return array_values( $blocks );
	}

	private static function remove_block( array $blocks, string $id ): array {
		$out = array();
		foreach ( $blocks as $block ) {
			if ( self::id( $block ) === $id ) {
				continue;
			}
			$block['innerBlocks'] = self::remove_block( (array) ( $block['innerBlocks'] ?? array() ), $id );
			$out[]                = $block;
		}
		return $out;
	}

	private static function extract_block( array $blocks, string $id, ?array &$moved ): array {
		$out = array();
		foreach ( $blocks as $block ) {
			if ( null === $moved && self::id( $block ) === $id ) {
				$moved = $block;
				continue;
			}
			$block['innerBlocks'] = self::extract_block( (array) ( $block['innerBlocks'] ?? array() ), $id, $moved );
			$out[]                = $block;
		}
		return $out;
	}

	private static function insert_block( array $blocks, mixed $parent_id, array $new_block, int $index ): array {
		if ( ! is_string( $parent_id ) || '' === $parent_id ) {
			$index = min( max( 0, $index ), count( $blocks ) );
			array_splice( $blocks, $index, 0, array( $new_block ) );
			return array_values( $blocks );
		}
		return self::map_block(
			$blocks,
			$parent_id,
			static function ( array $block ) use ( $new_block, $index ): array {
				$children = array_values( (array) ( $block['innerBlocks'] ?? array() ) );
				$position = min( max( 0, $index ), count( $children ) );
				array_splice( $children, $position, 0, array( $new_block ) );
				$block['innerBlocks'] = $children;
				return $block;
			}
		);
	}
}
