<?php
/**
 * Scope-specific deterministic target fingerprints.
 *
 * @package Nodera
 */

namespace Nodera\AI;

/**
 * Hashes a canonical projection of Gutenberg blocks.
 */
final class TargetFingerprint {
	/**
	 * Hash block data.
	 */
	public static function hash( array $blocks ): string {
		$json = wp_json_encode( self::canonicalize( self::strip_transient( $blocks ) ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		return hash( 'sha256', (string) $json );
	}

	/**
	 * Remove editor-runtime fields.
	 */
	private static function strip_transient( mixed $value ): mixed {
		if ( ! is_array( $value ) ) {
			return $value;
		}
		$out = array();
		foreach ( $value as $key => $item ) {
			if ( in_array( (string) $key, array( 'clientId', 'originalContent', 'validationIssues' ), true ) ) {
				continue;
			}
			$out[ $key ] = self::strip_transient( $item );
		}
		return $out;
	}

	/**
	 * Sort associative keys recursively while preserving list order.
	 */
	private static function canonicalize( mixed $value ): mixed {
		if ( ! is_array( $value ) ) {
			return $value;
		}
		if ( array_is_list( $value ) ) {
			return array_map( array( self::class, 'canonicalize' ), $value );
		}
		ksort( $value );
		foreach ( $value as $key => $item ) {
			$value[ $key ] = self::canonicalize( $item );
		}
		return $value;
	}
}
