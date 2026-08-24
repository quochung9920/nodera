<?php
/**
 * Provider-bound AI context sanitization.
 *
 * @package Nodera
 */

namespace Nodera\AI;

use WP_Error;

/**
 * Removes secrets and bounds untrusted/nested editor context before it leaves WordPress.
 */
final class ContextSanitizer {
	private const MAX_DEPTH        = 16;
	private const MAX_BLOCKS       = 300;
	private const MAX_STRING_BYTES = 20000;
	private const MAX_TOTAL_BYTES  = 786432;

	private int $block_count = 0;

	/**
	 * Sanitize one nodera-ai-context/v1 document for a remote provider.
	 *
	 * @return array|WP_Error
	 */
	public static function sanitize( array $context ): array|WP_Error {
		$allowed = array( 'schema', 'task', 'target', 'document', 'context', 'contracts', 'design', 'visualFacts', 'environment', 'limits', 'output' );
		$context = array_intersect_key( $context, array_flip( $allowed ) );
		$self    = new self();
		$clean   = $self->walk( $context, 0, 'context' );
		if ( is_wp_error( $clean ) ) {
			return $clean;
		}
		$encoded = wp_json_encode( $clean );
		if ( ! is_string( $encoded ) || strlen( $encoded ) > self::MAX_TOTAL_BYTES ) {
			return new WP_Error(
				'nodera_ai_context_too_large',
				'AI context exceeds the provider transmission budget.',
				array( 'status' => 413 )
			);
		}
		return $clean;
	}

	/**
	 * Recursively sanitize JSON-compatible data.
	 *
	 * @return mixed|WP_Error
	 */
	private function walk( mixed $value, int $depth, string $path ): mixed {
		if ( $depth > self::MAX_DEPTH ) {
			return new WP_Error(
				'nodera_ai_context_too_deep',
				'AI context nesting exceeds the supported depth.',
				array( 'status' => 413, 'path' => $path )
			);
		}
		if ( is_string( $value ) ) {
			$value = wp_check_invalid_utf8( $value, true );
			if ( strlen( $value ) > self::MAX_STRING_BYTES ) {
				$value = substr( $value, 0, self::MAX_STRING_BYTES );
			}
			return $value;
		}
		if ( is_int( $value ) || is_float( $value ) || is_bool( $value ) || null === $value ) {
			return $value;
		}
		if ( ! is_array( $value ) ) {
			return null;
		}

		if ( isset( $value['name'], $value['attributes'] ) && is_string( $value['name'] ) ) {
			++$this->block_count;
			if ( $this->block_count > self::MAX_BLOCKS ) {
				return new WP_Error(
					'nodera_ai_context_too_many_blocks',
					'AI context contains too many blocks.',
					array( 'status' => 413, 'path' => $path )
				);
			}
		}

		$out     = array();
		$is_list = array_is_list( $value );
		foreach ( $value as $key => $item ) {
			$key_string = (string) $key;
			if ( ! $is_list && $this->is_sensitive_key( $key_string ) ) {
				continue;
			}
			$child = $this->walk( $item, $depth + 1, $path . '.' . $key_string );
			if ( is_wp_error( $child ) ) {
				return $child;
			}
			if ( $is_list ) {
				$out[] = $child;
			} else {
				$out[ $key_string ] = $child;
			}
		}
		return $out;
	}

	private function is_sensitive_key( string $key ): bool {
		return 1 === preg_match( '/(?:password|passwd|api[_-]?key|secret|access[_-]?token|refresh[_-]?token|authorization|cookie|set-cookie|nonce)/i', $key );
	}
}
