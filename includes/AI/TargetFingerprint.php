<?php
namespace Nodera\AI;

final class TargetFingerprint {
	public static function hash( array $blocks ): string {
		return hash( 'sha256', wp_json_encode( self::canonicalize( self::strip_transient( $blocks ) ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
	}

	private static function strip_transient( mixed $value ): mixed {
		if ( ! is_array( $value ) ) {
			return $value;
		}
		$out = [];
		foreach ( $value as $key => $item ) {
			if ( in_array( (string) $key, [ 'clientId', 'originalContent', 'validationIssues' ], true ) ) {
				continue;
			}
			$out[ $key ] = self::strip_transient( $item );
		}
		return $out;
	}

	private static function canonicalize( mixed $value ): mixed {
		if ( ! is_array( $value ) ) {
			return $value;
		}
		if ( array_is_list( $value ) ) {
			return array_map( [ self::class, 'canonicalize' ], $value );
		}
		ksort( $value );
		foreach ( $value as $key => $item ) {
			$value[ $key ] = self::canonicalize( $item );
		}
		return $value;
	}
}
