<?php
/**
 * Nodera AI REST routes.
 *
 * @package Nodera
 */

namespace Nodera\Rest;

use Nodera\AI\ContextSanitizer;
use Nodera\AI\DesignQualityGate;
use Nodera\AI\DiffEngine;
use Nodera\AI\PatchValidator;
use Nodera\AI\TargetFingerprint;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use Nodera\Security\RequestThrottle;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class AIRestController {
	// Visual Fidelity v2 can include bounded measurements for three native device previews.
	private const MAX_CONTEXT_REQUEST_BYTES = 4194304;
	private const MAX_VALIDATE_REQUEST_BYTES = 2097152;

	public function __construct( private BlockContractRegistry $contracts ) {}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route( 'nodera/v1', '/contracts', array(
			'methods' => 'GET',
			'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
			'callback' => array( $this, 'get_contracts' ),
			'args' => array(
				'mode' => array( 'type' => 'string', 'enum' => array( 'focused', 'expanded', 'full' ), 'default' => 'focused' ),
				'task' => array( 'type' => 'string', 'default' => '' ),
			),
		) );
		register_rest_route( 'nodera/v1', '/ai/export', array(
			'methods' => 'POST',
			'permission_callback' => static fn( WP_REST_Request $request ) => current_user_can( 'edit_post', (int) $request->get_param( 'postId' ) ),
			'callback' => array( $this, 'export_context' ),
		) );
		register_rest_route( 'nodera/v1', '/ai/validate', array(
			'methods' => 'POST',
			'permission_callback' => static fn( WP_REST_Request $request ) => current_user_can( 'edit_post', (int) $request->get_param( 'postId' ) ),
			'callback' => array( $this, 'validate_patch' ),
		) );
		register_rest_route( 'nodera/v1', '/ai/generate', array(
			'methods' => 'POST',
			'permission_callback' => static fn( WP_REST_Request $request ) => current_user_can( 'edit_post', (int) $request->get_param( 'postId' ) ),
			'callback' => array( $this, 'generate_patch' ),
		) );
	}

	public function get_contracts( WP_REST_Request $request ): WP_REST_Response {
		$names = $request->get_param( 'blocks' );
		$names = is_string( $names ) && '' !== $names ? explode( ',', $names ) : array();
		return new WP_REST_Response( array(
			'catalogIndex' => $this->contracts->catalog(),
			'recommended' => $this->contracts->selection( (string) $request->get_param( 'task' ), $names, (string) ( $request->get_param( 'mode' ) ?: 'focused' ) ),
		), 200 );
	}

	/**
	 * Export a sanitized, provider-neutral AI session. No provider credential is required.
	 */
	public function export_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->prepare_context_body( $request, 'AI export' );
		if ( is_wp_error( $body ) ) {
			return $body;
		}
		$sanitized = ( new ContextSanitizer( $this->contracts ) )->sanitize( $body['context'] );
		$target = is_array( $sanitized['target'] ?? null ) ? $sanitized['target'] : array();
		$task = is_array( $sanitized['task'] ?? null ) ? $sanitized['task'] : array();
		$session_id = 'nds_' . str_replace( '-', '', wp_generate_uuid4() );

		return new WP_REST_Response(
			array(
				'schema' => 'nodera-ai-export/v1',
				'sessionId' => $session_id,
				'exportedAt' => gmdate( 'c' ),
				'noderaVersion' => NODERA_VERSION,
				'wordpressVersion' => get_bloginfo( 'version' ),
				'target' => $target,
				'task' => $task,
				'context' => $sanitized,
				'outputRequirements' => array(
					'schema' => 'nodera-patch/v1',
					'rules' => array(
						'Return exactly one nodera-patch/v1 JSON object.',
						'Do not return a full replacement page document or Gutenberg HTML comments.',
						'Do not target stable IDs outside the exported target.',
						'Use only registered block contracts and attributes supplied in the export.',
						'Prefer native Gutenberg/Core blocks, Block Supports, Style Engine, Global Styles and Block Bindings.',
					),
				),
			),
			200
		);
	}

	public function generate_patch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->prepare_context_body( $request, 'AI generation' );
		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$post_id = (int) $body['postId'];
		$throttle = ( new RequestThrottle() )->consume( $post_id );
		if ( is_wp_error( $throttle ) ) {
			return $throttle;
		}

		$patch = apply_filters( 'nodera_ai_generate_patch', null, $body, $request );
		if ( is_wp_error( $patch ) ) {
			return $patch;
		}
		if ( ! is_array( $patch ) ) {
			return new WP_Error( 'nodera_ai_provider_unavailable', 'No direct AI provider is configured. Export a portable AI session instead, or configure an optional provider under Settings → Nodera AI.', array( 'status' => 501 ) );
		}
		$validated = $this->validate_body( $body, $patch );
		if ( is_wp_error( $validated ) ) {
			return $validated;
		}
		$validated['patch'] = $patch;
		return new WP_REST_Response( $validated, 200 );
	}

	public function validate_patch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) ) {
			return new WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}
		$body = array_intersect_key( $input, array_flip( array( 'postId', 'currentBlocks', 'editableStableIds', 'visualFacts', 'patch' ) ) );
		$encoded = wp_json_encode( $body );
		if ( ! is_string( $encoded ) || strlen( $encoded ) > self::MAX_VALIDATE_REQUEST_BYTES ) {
			return new WP_Error( 'nodera_ai_request_too_large', 'AI validation request exceeds the maximum size.', array( 'status' => 413 ) );
		}
		$patch = is_array( $body['patch'] ?? null ) ? $body['patch'] : array();
		$result = $this->validate_body( $body, $patch );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $result, 200 );
	}

	/**
	 * Validate an exported context against the live Gutenberg scope before it leaves WordPress or reaches a direct provider.
	 *
	 * @return array|WP_Error
	 */
	private function prepare_context_body( WP_REST_Request $request, string $label ): array|WP_Error {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) ) {
			return new WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}
		$body = array_intersect_key( $input, array_flip( array( 'postId', 'context', 'currentBlocks', 'editableStableIds', 'visualFacts' ) ) );
		$encoded = wp_json_encode( $body );
		if ( ! is_string( $encoded ) || strlen( $encoded ) > self::MAX_CONTEXT_REQUEST_BYTES ) {
			return new WP_Error( 'nodera_ai_request_too_large', $label . ' request exceeds the maximum size.', array( 'status' => 413 ) );
		}

		$post_id = (int) ( $body['postId'] ?? 0 );
		if ( $post_id <= 0 ) {
			return new WP_Error( 'nodera_ai_invalid_post', 'A valid editable post is required.', array( 'status' => 400 ) );
		}

		$context = is_array( $body['context'] ?? null ) ? $body['context'] : array();
		$blocks  = is_array( $body['currentBlocks'] ?? null ) ? $body['currentBlocks'] : array();
		$ids     = is_array( $body['editableStableIds'] ?? null ) ? array_values( array_filter( $body['editableStableIds'], 'is_string' ) ) : array();
		if ( 'nodera-ai-context/v1' !== ( $context['schema'] ?? null ) || ! is_array( $context['target'] ?? null ) ) {
			return new WP_Error( 'nodera_ai_invalid_context', 'Portable AI workflows require nodera-ai-context/v1.', array( 'status' => 400 ) );
		}
		$kind = (string) ( $context['target']['kind'] ?? '' );
		if ( ! in_array( $kind, array( 'block', 'subtree', 'selection', 'page' ), true ) ) {
			return new WP_Error( 'nodera_ai_invalid_target_kind', 'AI context target kind is invalid.', array( 'status' => 400 ) );
		}
		$current_fingerprint = TargetFingerprint::hash( $blocks );
		if ( ! is_string( $context['target']['fingerprint'] ?? null ) || ! hash_equals( $current_fingerprint, $context['target']['fingerprint'] ) ) {
			return new WP_Error( 'nodera_ai_target_changed', 'Target changed before the AI session was prepared.', array( 'status' => 409 ) );
		}
		$context_ids = is_array( $context['target']['stableIds'] ?? null ) ? array_values( array_filter( $context['target']['stableIds'], 'is_string' ) ) : array();
		if ( count( $context_ids ) !== count( array_unique( $context_ids ) ) || count( $ids ) !== count( array_unique( $ids ) ) ) {
			return new WP_Error( 'nodera_ai_invalid_target_ids', 'AI context target contains duplicate stable IDs.', array( 'status' => 400 ) );
		}
		foreach ( array_merge( $context_ids, $ids ) as $id ) {
			if ( ! StableBlockId::is_valid( $id ) ) {
				return new WP_Error( 'nodera_ai_invalid_target_ids', 'AI context target contains an invalid stable ID.', array( 'status' => 400 ) );
			}
		}
		$expected_ids = $ids;
		$actual_ids = $context_ids;
		sort( $expected_ids );
		sort( $actual_ids );
		if ( $expected_ids !== $actual_ids ) {
			return new WP_Error( 'nodera_ai_target_scope_mismatch', 'AI context target does not match the editable Gutenberg scope.', array( 'status' => 409 ) );
		}
		return $body;
	}

	/**
	 * Keep block-only sessions from changing child structure. Subtree/page scopes are required for structural edits.
	 */
	private function validate_block_scope( array $patch, array $blocks ): bool|WP_Error {
		if ( 'block' !== ( $patch['target']['kind'] ?? '' ) ) {
			return true;
		}
		$operations = is_array( $patch['operations'] ?? null ) ? $patch['operations'] : array();
		$root = is_array( $blocks[0] ?? null ) ? $blocks[0] : array();
		$root_has_children = ! empty( $root['innerBlocks'] );
		foreach ( $operations as $index => $operation ) {
			if ( ! is_array( $operation ) ) {
				continue;
			}
			$op = (string) ( $operation['op'] ?? '' );
			if ( in_array( $op, array( 'insertBlock', 'moveBlock', 'replaceInnerBlocks' ), true ) ) {
				return new WP_Error(
					'nodera_ai_block_scope_structure',
					'Block-only AI sessions cannot restructure inner blocks. Export the selected subtree instead.',
					array( 'status' => 403, 'operationIndex' => $index )
				);
			}
			if ( 'replaceBlock' === $op ) {
				$replacement = is_array( $operation['block'] ?? null ) ? $operation['block'] : array();
				if ( $root_has_children || ! empty( $replacement['innerBlocks'] ) ) {
					return new WP_Error(
						'nodera_ai_block_scope_structure',
						'Block-only replacement cannot add, remove, or replace child structure. Export the selected subtree instead.',
						array( 'status' => 403, 'operationIndex' => $index )
					);
				}
			}
		}
		return true;
	}

	private function validate_body( array $body, array $patch ): array|WP_Error {
		$blocks = is_array( $body['currentBlocks'] ?? null ) ? $body['currentBlocks'] : array();
		$ids = is_array( $body['editableStableIds'] ?? null ) ? array_values( array_filter( $body['editableStableIds'], 'is_string' ) ) : array();
		$scope = $this->validate_block_scope( $patch, $blocks );
		if ( is_wp_error( $scope ) ) {
			return $scope;
		}
		$result = ( new PatchValidator( $this->contracts ) )->validate( $patch, $blocks, $ids );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$candidate = $result['candidate'];
		return array(
			'valid' => true,
			'fingerprint' => TargetFingerprint::hash( $blocks ),
			'summary' => array( 'operationCount' => $result['operationCount'] ),
			'candidate' => $candidate,
			'diff' => DiffEngine::diff( $blocks, $candidate ),
			'quality' => DesignQualityGate::review( $candidate, is_array( $body['visualFacts'] ?? null ) ? $body['visualFacts'] : array() ),
		);
	}
}
