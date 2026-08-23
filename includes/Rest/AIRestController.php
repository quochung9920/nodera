<?php
/**
 * Nodera AI REST routes.
 *
 * @package Nodera
 */

namespace Nodera\Rest;

use Nodera\AI\DesignQualityGate;
use Nodera\AI\DiffEngine;
use Nodera\AI\PatchValidator;
use Nodera\AI\TargetFingerprint;
use Nodera\Contracts\BlockContractRegistry;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Server-authoritative contract, generation bridge and patch-validation endpoints.
 */
final class AIRestController {
	public function __construct( private BlockContractRegistry $contracts ) {}

	/**
	 * Register routes.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register Nodera AI endpoints.
	 */
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

	/**
	 * Return discovery catalog and selected full contracts.
	 */
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

	/**
	 * Ask a configured provider bridge for a patch, then validate it before returning it.
	 *
	 * Providers integrate through the `nodera_ai_generate_patch` filter and must return
	 * a decoded nodera-patch/v1 array. Nodera itself remains provider-neutral.
	 */
	public function generate_patch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}
		$encoded = wp_json_encode( $body );
		if ( ! is_string( $encoded ) || strlen( $encoded ) > 1048576 ) {
			return new WP_Error( 'nodera_ai_request_too_large', 'AI generation request exceeds the maximum size.', array( 'status' => 413 ) );
		}

		/**
		 * Filter a provider-generated Nodera patch.
		 *
		 * @param array|null      $patch   Decoded nodera-patch/v1 patch, or null when no provider is configured.
		 * @param array           $body    Sanitized request payload containing context and current target data.
		 * @param WP_REST_Request $request Current REST request.
		 */
		$patch = apply_filters( 'nodera_ai_generate_patch', null, $body, $request );
		if ( ! is_array( $patch ) ) {
			return new WP_Error(
				'nodera_ai_provider_unavailable',
				'No direct AI provider is configured. Connect a Nodera provider bridge or use the manual external-AI fallback.',
				array( 'status' => 501 )
			);
		}

		$validated = $this->validate_body( $body, $patch );
		if ( is_wp_error( $validated ) ) {
			return $validated;
		}
		$validated['patch'] = $patch;
		return new WP_REST_Response( $validated, 200 );
	}

	/**
	 * Validate a patch and return candidate/diff/quality evidence.
	 */
	public function validate_patch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}
		$patch = is_array( $body['patch'] ?? null ) ? $body['patch'] : array();
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
