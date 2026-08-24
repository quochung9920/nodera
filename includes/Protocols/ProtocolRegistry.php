<?php
/**
 * Portable AI protocol metadata and integrity helpers.
 *
 * @package Nodera
 */

namespace Nodera\Protocols;

/**
 * Defines the stable transport contracts shared by browser, REST and external AI clients.
 */
final class ProtocolRegistry {
	public const CONTEXT_SCHEMA = 'nodera-ai-context/v1';
	public const EXPORT_SCHEMA  = 'nodera-ai-export/v1';
	public const PATCH_SCHEMA   = 'nodera-patch/v1';
	public const VERSION        = '1.0';

	/**
	 * Describe the portable protocol without exposing site secrets.
	 */
	public function descriptor(): array {
		return array(
			'name'                   => 'nodera-portable-ai',
			'version'                => self::VERSION,
			'contextSchema'          => self::CONTEXT_SCHEMA,
			'exportSchema'           => self::EXPORT_SCHEMA,
			'patchSchema'            => self::PATCH_SCHEMA,
			'supportedScopes'        => array( 'block', 'subtree', 'page' ),
			'maxOperations'          => 200,
			'maxPatchBytes'          => 524288,
			'backwardCompatibleWith' => array( '1.0' ),
			'capabilities'           => array(
				'serverSanitizedExport',
				'targetFingerprint',
				'editableStableIds',
				'blockContracts',
				'semanticDiff',
				'qualityGate',
				'nativeUndoSave',
			),
		);
	}

	/**
	 * Build a deterministic integrity hash over the immutable export envelope.
	 */
	public function integrity( array $target, array $context, array $requirements ): array {
		$payload = wp_json_encode(
			array(
				'target'             => $this->canonicalize( $target ),
				'context'            => $this->canonicalize( $context ),
				'outputRequirements' => $this->canonicalize( $requirements ),
			)
		);
		return array(
			'algorithm' => 'sha256',
			'value'     => hash( 'sha256', is_string( $payload ) ? $payload : '' ),
		);
	}

	/**
	 * Stable recursive key ordering for object-like PHP arrays.
	 */
	private function canonicalize( mixed $value ): mixed {
		if ( ! is_array( $value ) ) {
			return $value;
		}
		if ( array_is_list( $value ) ) {
			return array_map( array( $this, 'canonicalize' ), $value );
		}
		ksort( $value );
		foreach ( $value as $key => $item ) {
			$value[ $key ] = $this->canonicalize( $item );
		}
		return $value;
	}
}
