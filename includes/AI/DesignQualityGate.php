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

		$state = array(
			'anchors'          => array(),
			'lastHeadingLevel' => null,
		);
		self::walk( $blocks, $findings, $state );

		$nodes = $visual_facts['browser']['nodes'] ?? $visual_facts['nodes'] ?? array();
		if ( is_array( $nodes ) ) {
			foreach ( $nodes as $id => $node ) {
				if ( ! is_array( $node ) ) {
					continue;
				}
				if ( ! empty( $node['horizontalOverflow'] ) ) {
					$findings[] = self::finding( 'warning', 'nodera_horizontal_overflow', 'Measured node overflows horizontally.', 'browser-measured', (string) $id );
				}
				$rect = is_array( $node['rect'] ?? null ) ? $node['rect'] : array();
				if ( isset( $rect['width'], $rect['height'] ) && ( (float) $rect['width'] <= 0 || (float) $rect['height'] <= 0 ) && 'none' !== ( $node['display'] ?? '' ) ) {
					$findings[] = self::finding( 'warning', 'nodera_zero_size', 'Measured node has a zero-size rendered box.', 'browser-measured', (string) $id );
				}
				if ( 'hidden' === ( $node['visibility'] ?? '' ) || '0' === (string) ( $node['opacity'] ?? '' ) ) {
					$findings[] = self::finding( 'info', 'nodera_visually_hidden', 'Measured node is visually hidden in the captured viewport.', 'browser-measured', (string) $id );
				}
			}
		}
		return $findings;
	}

	private static function walk( array $blocks, array &$findings, array &$state ): void {
		foreach ( $blocks as $block ) {
			$name  = (string) ( $block['name'] ?? '' );
			$attrs = (array) ( $block['attributes'] ?? array() );
			$id    = isset( $attrs['noderaId'] ) ? (string) $attrs['noderaId'] : '';

			if ( 'core/image' === $name && '' === trim( (string) ( $attrs['alt'] ?? '' ) ) ) {
				$findings[] = self::finding( 'warning', 'nodera_image_alt_missing', 'Image has no alternative text.', 'document', $id );
			}
			if ( 'core/button' === $name ) {
				if ( '' === trim( wp_strip_all_tags( (string) ( $attrs['text'] ?? '' ) ) ) ) {
					$findings[] = self::finding( 'warning', 'nodera_button_name_missing', 'Button has no accessible text label.', 'document', $id );
				}
				if ( '' === trim( (string) ( $attrs['url'] ?? '' ) ) ) {
					$findings[] = self::finding( 'warning', 'nodera_button_url_missing', 'Button has no destination URL.', 'document', $id );
				}
				$style = is_array( $attrs['style'] ?? null ) ? $attrs['style'] : array();
				if ( empty( $style[':focus-visible'] ) ) {
					$findings[] = self::finding( 'info', 'nodera_focus_visible_inherited', 'Button has no block-level focus-visible override; verify the theme provides a visible keyboard focus style.', 'document', $id );
				}
			}

			if ( 'core/heading' === $name ) {
				$level = (int) ( $attrs['level'] ?? 2 );
				$last  = $state['lastHeadingLevel'];
				if ( is_int( $last ) && $level > $last + 1 ) {
					$findings[] = self::finding( 'warning', 'nodera_heading_level_skip', 'Heading hierarchy skips a level.', 'document', $id );
				}
				$state['lastHeadingLevel'] = $level;
			}

			$anchor = trim( (string) ( $attrs['anchor'] ?? '' ) );
			if ( '' !== $anchor ) {
				if ( isset( $state['anchors'][ $anchor ] ) ) {
					$findings[] = self::finding( 'warning', 'nodera_duplicate_anchor', 'Multiple blocks use the same HTML anchor.', 'document', $id );
				} else {
					$state['anchors'][ $anchor ] = true;
				}
			}

			if ( in_array( $name, array( 'core/navigation-link', 'core/navigation-submenu' ), true ) && '' === trim( (string) ( $attrs['url'] ?? '' ) ) ) {
				$findings[] = self::finding( 'warning', 'nodera_empty_navigation_url', 'Navigation item has no destination URL.', 'document', $id );
			}
			if ( str_starts_with( $name, 'nodera/' ) ) {
				$findings[] = self::finding( 'info', 'nodera_legacy_block', 'Candidate still contains a legacy Nodera custom block where a Core equivalent is preferred.', 'document', $id );
			}
			if ( ! empty( $attrs['noderaCustomCSS'] ) ) {
				$findings[] = self::finding( 'info', 'nodera_custom_css_used', 'Candidate relies on scoped Custom CSS.', 'document', $id );
			}
			self::walk( (array) ( $block['innerBlocks'] ?? array() ), $findings, $state );
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
