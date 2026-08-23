<?php
/**
 * Deterministic AI design-quality checks.
 *
 * @package Nodera
 */

namespace Nodera\AI;

/**
 * Reports only findings backed by document or measured-browser evidence.
 */
final class DesignQualityGate {
	/**
	 * Review a candidate tree.
	 */
	public static function review( array $blocks, array $visual_facts = array() ): array {
		$findings = array();
		$ids      = CandidateTree::ids( $blocks );
		if ( count( $ids ) !== count( array_unique( $ids ) ) ) {
			$findings[] = self::finding( 'error', 'nodera_duplicate_ids', 'Candidate contains duplicate persistent block IDs.', 'document' );
		}
		self::walk( $blocks, $findings );
		$nodes = $visual_facts['browser']['nodes'] ?? $visual_facts['nodes'] ?? array();
		if ( is_array( $nodes ) ) {
			foreach ( $nodes as $id => $node ) {
				if ( ! empty( $node['horizontalOverflow'] ) ) {
					$findings[] = self::finding( 'warning', 'nodera_horizontal_overflow', 'Measured node overflows horizontally.', 'browser-measured', (string) $id );
				}
			}
		}
		return $findings;
	}

	private static function walk( array $blocks, array &$findings ): void {
		foreach ( $blocks as $block ) {
			$name  = (string) ( $block['name'] ?? '' );
			$attrs = (array) ( $block['attributes'] ?? array() );
			$id    = isset( $attrs['noderaId'] ) ? (string) $attrs['noderaId'] : '';
			if ( 'core/image' === $name && '' === trim( (string) ( $attrs['alt'] ?? '' ) ) ) {
				$findings[] = self::finding( 'warning', 'nodera_image_alt_missing', 'Image has no alternative text.', 'document', $id );
			}
			if ( 'core/button' === $name && '' === trim( wp_strip_all_tags( (string) ( $attrs['text'] ?? '' ) ) ) ) {
				$findings[] = self::finding( 'warning', 'nodera_button_name_missing', 'Button has no accessible text label.', 'document', $id );
			}
			if ( ! empty( $attrs['noderaCustomCSS'] ) ) {
				$findings[] = self::finding( 'info', 'nodera_custom_css_used', 'Candidate relies on scoped Custom CSS.', 'document', $id );
			}
			self::walk( (array) ( $block['innerBlocks'] ?? array() ), $findings );
		}
	}

	private static function finding( string $severity, string $code, string $message, string $source, string $stable_id = '' ): array {
		$out = compact( 'severity', 'code', 'message', 'source' );
		if ( '' !== $stable_id ) {
			$out['stableId'] = $stable_id;
		}
		return $out;
	}
}
