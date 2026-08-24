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
use Nodera\AI\ProviderManager;
use Nodera\AI\TargetFingerprint;
use Nodera\Contracts\BlockContractRegistry;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Server-authoritative contracts, provider generation and patch validation.
 */
final class AIRestController {
	public function __construct( private BlockContractRegistry $contracts, private ProviderManager $providers ) {}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route(
			'nodera/v1',
			'/contracts',
			array(
				'methods'             => 'GET',
				'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
				'callback'            => array( $this, 'get_contracts' ),
				'args'                => array(
					'mode' => array( 'type' => 'string', 'enum' => array( 'focused', 'expanded', 'full' ), 'default' => 'focused' ),
					'task' => array( 'type' => 'string', 'default' => '' ),
				),
			)
		);
		register_rest_route(
			'nodera/v1',
			'/ai/provider',
			array(
				'methods'             => 'GET',
				'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
				'callback'            => array( $this, 'get_provider_status' ),
			)
		);
		register_rest_route(
			'nodera/v1',
			'/ai/validate',
			array(
				'methods'             => 'POST',
				'permission_callback' => static fn( WP_REST_Request $request ) => current_user_can( 'edit_post', (int) $request->get_param( 'postId' ) ),
				'callback'            => array( $this, 'validate_patch' ),
			)
		);
		register_rest_route(
			'nodera/v1',
			'/ai/generate',
			array(
				'methods'             => 'POST',
				'permission_callback' => static fn( WP_REST_Request $request ) => current_user_can( 'edit_post', (int) $request->get_param( 'postId' ) ),
				'callback'            => array( $this, 'generate_patch' ),
			)
		);
	}

	public function get_contracts( WP_REST_Request $request ): WP_REST_Response {
		$names = $request->get_param( 'blocks' );
		$names = is_string( $names ) && '' !== $names ? explode( ',', $names ) : array();
		$mode  = (string) $request->get_param( 'mode' );
		$task  = (string) $request->get_param( 'task' );
		return new WP_REST_Response(
			array(
				'catalogIndex' => $this->contracts->catalog(),
				'recommended'  => $this->contracts->selection( $task, $names, $mode ?: 'focused' ),
			),
			200
		);
	}

	public function get_provider_status(): WP_REST_Response {
		return new WP_REST_Response( $this->providers->status(), 200 );
	}

	/**
	 * Generate through an explicit extension filter or the configured server-side provider.
	 */
	public function generate_patch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) ) {
			return new WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}

		$body = array_intersect_key(
			$input,
			array_flip( array( 'postId', 'context', 'currentBlocks', 'editableStableIds', 'visualFacts' ) )
		);
		$encoded = wp_json_encode( $body );
		if ( ! is_string( $encoded ) || strlen( $encoded ) > 1048576 ) {
			return new WP_Error( 'nodera_ai_request_too_large', 'AI generation request exceeds the maximum size.', array( 'status' => 413 ) );
		}

		$context = is_array( $body['context'] ?? null ) ? $body['context'] : array();
		$blocks  = is_array( $body['currentBlocks'] ?? null ) ? $body['currentBlocks'] : array();
		$ids     = is_array( $body['editableStableIds'] ?? null ) ? array_values( array_filter( $body['editableStableIds'], 'is_string' ) ) : array();
		if ( 'nodera-ai-context/v1' !== ( $context['schema'] ?? null ) || ! is_array( $context['target'] ?? null ) ) {
			return new WP_Error( 'nodera_ai_invalid_context', 'Direct generation requires nodera-ai-context/v1.', array( 'status' => 400 ) );
		}

		$context_fingerprint = $context['target']['fingerprint'] ?? '';
		$current_fingerprint = TargetFingerprint::hash( $blocks );
		if ( ! is_string( $context_fingerprint ) || ! hash_equals( $current_fingerprint, $context_fingerprint ) ) {
			return new WP_Error( 'nodera_ai_target_changed', 'Target changed before AI generation started.', array( 'status' => 409 ) );
		}
		$context_ids  = is_array( $context['target']['stableIds'] ?? null ) ? array_values( array_filter( $context['target']['stableIds'], 'is_string' ) ) : array();
		$expected_ids = array_values( array_unique( $ids ) );
		$actual_ids   = array_values( array_unique( $context_ids ) );
		sort( $expected_ids );
		sort( $actual_ids );
		if ( $expected_ids !== $actual_ids ) {
			return new WP_Error( 'nodera_ai_target_scope_mismatch', 'AI context target does not match the editable Gutenberg scope.', array( 'status' => 409 ) );
		}

		$sanitized = ContextSanitizer::sanitize( $context );
		if ( is_wp_error( $sanitized ) ) {
			return $sanitized;
		}
		$provider_body            = $body;
		$provider_body['context'] = $sanitized;

		/**
		 * Allow a trusted integration to provide a patch before the built-in provider manager.
		 *
		 * @param array|WP_Error|null $patch   Decoded nodera-patch/v1, an error, or null to continue.
		 * @param array               $body    Sanitized provider payload.
		 * @param WP_REST_Request     $request Current request.
		 */
		$patch = apply_filters( 'nodera_ai_generate_patch', null, $provider_body, $request );
		if ( is_wp_error( $patch ) ) {
			return $patch;
		}
		if ( ! is_array( $patch ) ) {
			$patch = $this->providers->generate( $provider_body );
		}
		if ( is_wp_error( $patch ) ) {
			return $patch;
		}

		$validated = $this->validate_body( $body, $patch );
		if ( is_wp_error( $validated ) ) {
			return $validated;
		}
		$validated['patch']    = $patch;
		$validated['provider'] = $this->providers->status();
		return new WP_REST_Response( $validated, 200 );
	}

	public function validate_patch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}
		$patch  = is_array( $body['patch'] ?? null ) ? $body['patch'] : array();
		$result = $this->validate_body( $body, $patch );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * Validate target data plus patch without mutating Gutenberg.
	 *
	 * @return array|WP_Error
	 */
	private function validate_body( array $body, array $patch ): array|WP_Error {
		$blocks = is_array( $body['currentBlocks'] ?? null ) ? $body['currentBlocks'] : array();
		$ids    = is_array( $body['editableStableIds'] ?? null ) ? array_values( array_filter( $body['editableStableIds'], 'is_string' ) ) : array();
		$result = ( new PatchValidator( $this->contracts ) )->validate( $patch, $blocks, $ids );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$candidate = $result['candidate'];
		return array(
			'valid'       => true,
			'fingerprint' => TargetFingerprint::hash( $blocks ),
			'summary'     => array( 'operationCount' => $result['operationCount'] ),
			'candidate'   => $candidate,
			'diff'        => DiffEngine::diff( $blocks, $candidate ),
			'quality'     => DesignQualityGate::review( $candidate, is_array( $body['visualFacts'] ?? null ) ? $body['visualFacts'] : array() ),
		);
	}
}
