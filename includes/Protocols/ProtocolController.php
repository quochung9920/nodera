<?php
/**
 * REST exposure and export-envelope hardening for the portable AI protocol.
 *
 * @package Nodera
 */

namespace Nodera\Protocols;

use WP_REST_Request;
use WP_REST_Response;

/**
 * Publishes protocol capabilities and stamps sanitized exports with protocol/integrity metadata.
 */
final class ProtocolController {
	public function __construct( private ProtocolRegistry $registry ) {}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_route' ) );
		add_filter( 'rest_post_dispatch', array( $this, 'stamp_export' ), 10, 3 );
	}

	public function register_route(): void {
		register_rest_route(
			'nodera/v1',
			'/protocol',
			array(
				'methods'             => 'GET',
				'permission_callback' => static fn(): bool => current_user_can( 'edit_posts' ),
				'callback'            => fn(): WP_REST_Response => new WP_REST_Response( $this->registry->descriptor(), 200 ),
			)
		);
	}

	/**
	 * Add immutable protocol metadata after the existing export endpoint has sanitized the context.
	 */
	public function stamp_export( mixed $result, mixed $server, WP_REST_Request $request ): mixed {
		unset( $server );
		if ( '/nodera/v1/ai/export' !== $request->get_route() || ! $result instanceof WP_REST_Response || $result->is_error() ) {
			return $result;
		}
		$data = $result->get_data();
		if ( ! is_array( $data ) || ProtocolRegistry::EXPORT_SCHEMA !== ( $data['schema'] ?? '' ) ) {
			return $result;
		}
		$target       = is_array( $data['target'] ?? null ) ? $data['target'] : array();
		$context      = is_array( $data['context'] ?? null ) ? $data['context'] : array();
		$requirements = is_array( $data['outputRequirements'] ?? null ) ? $data['outputRequirements'] : array();
		$data['protocol']  = $this->registry->descriptor();
		$data['integrity'] = $this->registry->integrity( $target, $context, $requirements );
		$result->set_data( $data );
		return $result;
	}
}
