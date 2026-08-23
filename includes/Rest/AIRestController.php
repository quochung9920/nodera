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
use WP_REST_Request;
use WP_REST_Response;

/**
 * Server-authoritative contract and patch-validation endpoints.
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
	 * Validate a patch and return candidate/diff/quality evidence.
	 */
	public function validate_patch( WP_REST_Request $request ): WP_REST_Response|\WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new \WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', array( 'status' => 400 ) );
		}
		$blocks = is_array( $body['currentBlocks'] ?? null ) ? $body['currentBlocks'] : array();
		$ids    = is_array( $body['editableStableIds'] ?? null ) ? array_values( array_filter( $body['editableStableIds'], 'is_string' ) ) : array();
		$patch  = is_array( $body['patch'] ?? null ) ? $body['patch'] : array();
		$result = ( new PatchValidator( $this->contracts ) )->validate( $patch, $blocks, $ids );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$candidate = $result['candidate'];
		return new WP_REST_Response(
			array(
				'valid'       => true,
				'fingerprint' => TargetFingerprint::hash( $blocks ),
				'summary'     => array( 'operationCount' => $result['operationCount'] ),
				'candidate'   => $candidate,
				'diff'        => DiffEngine::diff( $blocks, $candidate ),
				'quality'     => DesignQualityGate::review( $candidate, is_array( $body['visualFacts'] ?? null ) ? $body['visualFacts'] : array() ),
			),
			200
		);
	}
}
