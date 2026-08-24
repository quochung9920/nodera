<?php
/**
 * Deterministic AI design-quality checks.
 *
 * @package Nodera
 */

namespace Nodera\AI;

final class DesignQualityGate {
	public static function review( array $blocks, array $visual_facts = array() ): array {
		$findings = array();
		$ids = CandidateTree::ids( $blocks );
		if ( count( $ids ) !== count( array_unique( $ids ) ) ) {
			$findings[] = self::finding( 'error', 'nodera_duplicate_ids', 'Candidate contains duplicate persistent block IDs.', 'document' );
		}
		$anchors = array();
		$headings = array();
		self::walk( $blocks, $findings, $anchors, $headings );
		$duplicates = array_diff_assoc( $anchors, array_unique( $anchors ) );
		foreach ( array_unique( $duplicates ) as $anchor ) {
			$findings[] = self::finding( 'warning', 'nodera_duplicate_anchor', 'Duplicate HTML anchor: ' . $anchor . '.', 'document' );
		}
		for ( $i = 1; $i < count( $headings ); $i++ ) {
			if ( $headings[ $i ]['level'] > $headings[ $i - 1 ]['level'] + 1 ) {
				$findings[] = self::finding( 'warning', 'nodera_heading_level_skip', 'Heading hierarchy skips a level.', 'document', $headings[ $i ]['id'] );
			}
		}
		$nodes = $visual_facts['browser']['nodes'] ?? $visual_facts['nodes'] ?? array();
		if ( is_array( $nodes ) ) {
			foreach ( $nodes as $id => $node ) {
				if ( ! empty( $node['horizontalOverflow'] ) ) $findings[] = self::finding( 'warning', 'nodera_horizontal_overflow', 'Measured node overflows horizontally.', 'browser-measured', (string) $id );
				$rect = is_array( $node['rect'] ?? null ) ? $node['rect'] : array();
				if ( isset( $rect['width'], $rect['height'] ) && ( (float) $rect['width'] <= 0 || (float) $rect['height'] <= 0 ) ) $findings[] = self::finding( 'warning', 'nodera_zero_size', 'Measured node has zero rendered size.', 'browser-measured', (string) $id );
				if ( isset( $node['visibility'] ) && 'hidden' === $node['visibility'] ) $findings[] = self::finding( 'info', 'nodera_hidden_node', 'Measured node is hidden by visibility.', 'browser-measured', (string) $id );
			}
		}
		return $findings;
	}

	private static function walk( array $blocks, array &$findings, array &$anchors, array &$headings ): void {
		foreach ( $blocks as $block ) {
			$name = (string) ( $block['name'] ?? '' );
			$attrs = (array) ( $block['attributes'] ?? array() );
			$id = isset( $attrs['noderaId'] ) ? (string) $attrs['noderaId'] : '';
			if ( isset( $attrs['anchor'] ) && is_string( $attrs['anchor'] ) && '' !== trim( $attrs['anchor'] ) ) $anchors[] = trim( $attrs['anchor'] );
			if ( 'core/heading' === $name ) $headings[] = array( 'level' => max( 1, min( 6, (int) ( $attrs['level'] ?? 2 ) ) ), 'id' => $id );
			if ( 'core/image' === $name && '' === trim( (string) ( $attrs['alt'] ?? '' ) ) ) $findings[] = self::finding( 'warning', 'nodera_image_alt_missing', 'Image has no alternative text.', 'document', $id );
			if ( 'core/button' === $name ) {
				if ( '' === trim( wp_strip_all_tags( (string) ( $attrs['text'] ?? '' ) ) ) ) $findings[] = self::finding( 'warning', 'nodera_button_name_missing', 'Button has no accessible text label.', 'document', $id );
				if ( isset( $attrs['url'] ) && '' === trim( (string) $attrs['url'] ) ) $findings[] = self::finding( 'info', 'nodera_button_url_empty', 'Button has no destination URL.', 'document', $id );
			}
			if ( in_array( $name, array( 'core/navigation-link', 'core/navigation-submenu' ), true ) && '' === trim( (string) ( $attrs['url'] ?? '' ) ) ) $findings[] = self::finding( 'warning', 'nodera_link_url_missing', 'Navigation link has no URL.', 'document', $id );
			if ( ! empty( $attrs['noderaCustomCSS'] ) ) $findings[] = self::finding( 'info', 'nodera_custom_css_used', 'Candidate relies on scoped Custom CSS instead of native Gutenberg styles.', 'document', $id );
			self::walk( (array) ( $block['innerBlocks'] ?? array() ), $findings, $anchors, $headings );
		}
	}

	private static function finding( string $severity, string $code, string $message, string $source, string $stable_id = '' ): array {
		$out = compact( 'severity', 'code', 'message', 'source' );
		if ( '' !== $stable_id ) $out['stableId'] = $stable_id;
		return $out;
	}
}
