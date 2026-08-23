<?php
namespace Nodera\Rest;

use Nodera\AI\PatchValidator;
use Nodera\AI\TargetFingerprint;
use Nodera\Contracts\BlockContractRegistry;
use WP_REST_Request;
use WP_REST_Response;

final class AIRestController {
	public function __construct( private BlockContractRegistry $contracts ) {}

	public function register(): void {
		add_action( 'rest_api_init', function (): void {
			register_rest_route( 'nodera/v1', '/contracts', [ 'methods' => 'GET', 'permission_callback' => fn() => current_user_can( 'edit_posts' ), 'callback' => fn() => rest_ensure_response( $this->contracts->catalog() ) ] );
			register_rest_route( 'nodera/v1', '/ai/validate', [
				'methods' => 'POST',
				'permission_callback' => fn( WP_REST_Request $r ) => current_user_can( 'edit_post', (int) $r->get_param( 'postId' ) ),
				'callback' => [ $this, 'validate_patch' ],
			] );
		} );
	}

	public function validate_patch( WP_REST_Request $request ): WP_REST_Response|\WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new \WP_Error( 'nodera_ai_invalid_request', 'Invalid JSON body.', [ 'status' => 400 ] );
		}
		$blocks = is_array( $body['currentBlocks'] ?? null ) ? $body['currentBlocks'] : [];
		$ids = is_array( $body['editableStableIds'] ?? null ) ? array_values( array_filter( $body['editableStableIds'], 'is_string' ) ) : [];
		$patch = is_array( $body['patch'] ?? null ) ? $body['patch'] : [];
		$result = ( new PatchValidator( $this->contracts ) )->validate( $patch, $blocks, $ids );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new WP_REST_Response( [ 'valid' => true, 'fingerprint' => TargetFingerprint::hash( $blocks ), 'summary' => $result ], 200 );
	}
}
