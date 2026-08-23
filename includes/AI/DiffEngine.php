<?php
/**
 * Semantic block-tree diff.
 *
 * @package Nodera
 */

namespace Nodera\AI;

/**
 * Produces human-readable structural changes keyed by Nodera IDs.
 */
final class DiffEngine {
	/**
	 * Diff current and candidate trees.
	 */
	public static function diff( array $before, array $after ): array {
		$left  = self::index( $before );
		$right = self::index( $after );
		$diff  = array();

		foreach ( $left as $id => $node ) {
			if ( ! isset( $right[ $id ] ) ) {
				$diff[] = array( 'type' => 'removed', 'stableId' => $id, 'blockName' => $node['name'] );
				continue;
			}
			if ( $node['name'] !== $right[ $id ]['name'] ) {
				$diff[] = array( 'type' => 'replaced', 'stableId' => $id, 'from' => $node['name'], 'to' => $right[ $id ]['name'] );
			}
			$keys = array_unique( array_merge( array_keys( $node['attributes'] ), array_keys( $right[ $id ]['attributes'] ) ) );
			foreach ( $keys as $key ) {
				$old = $node['attributes'][ $key ] ?? null;
				$new = $right[ $id ]['attributes'][ $key ] ?? null;
				if ( $old !== $new ) {
					$diff[] = array( 'type' => 'attribute', 'stableId' => $id, 'blockName' => $node['name'], 'property' => $key, 'before' => $old, 'after' => $new );
				}
			}
			if ( $node['parent'] !== $right[ $id ]['parent'] || $node['index'] !== $right[ $id ]['index'] ) {
				$diff[] = array( 'type' => 'moved', 'stableId' => $id, 'blockName' => $node['name'], 'fromParent' => $node['parent'], 'toParent' => $right[ $id ]['parent'] );
			}
		}
		foreach ( $right as $id => $node ) {
			if ( ! isset( $left[ $id ] ) ) {
				$diff[] = array( 'type' => 'inserted', 'stableId' => $id, 'blockName' => $node['name'] );
			}
		}
		return $diff;
	}

	private static function index( array $blocks, ?string $parent = null, array &$out = array() ): array {
		foreach ( array_values( $blocks ) as $index => $block ) {
			$id = $block['attributes']['noderaId'] ?? null;
			if ( is_string( $id ) && '' !== $id ) {
				$out[ $id ] = array(
					'name'       => (string) ( $block['name'] ?? '' ),
					'attributes' => (array) ( $block['attributes'] ?? array() ),
					'parent'     => $parent,
					'index'      => $index,
				);
			}
			self::index( (array) ( $block['innerBlocks'] ?? array() ), is_string( $id ) ? $id : $parent, $out );
		}
		return $out;
	}
}
