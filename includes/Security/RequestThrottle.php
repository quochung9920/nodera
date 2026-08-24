<?php
/**
 * Lightweight per-user AI generation throttling.
 *
 * @package Nodera
 */

namespace Nodera\Security;

use WP_Error;

final class RequestThrottle {
	private const DEFAULT_LIMIT = 12;
	private const DEFAULT_WINDOW = 60;

	public function consume( int $post_id ): true|WP_Error {
		$user_id = (int) get_current_user_id();
		if ( $user_id <= 0 ) {
			return new WP_Error( 'nodera_ai_auth_required', 'Authentication is required for AI generation.', array( 'status' => 401 ) );
		}

		$limit  = max( 0, (int) apply_filters( 'nodera_ai_rate_limit', self::DEFAULT_LIMIT, $user_id, $post_id ) );
		$window = max( 1, (int) apply_filters( 'nodera_ai_rate_window', self::DEFAULT_WINDOW, $user_id, $post_id ) );
		if ( 0 === $limit ) {
			return true;
		}

		$key   = 'nodera_ai_rl_' . hash( 'sha256', $user_id . '|' . $post_id );
		$now   = time();
		$state = get_transient( $key );
		if ( ! is_array( $state ) || (int) ( $state['reset_at'] ?? 0 ) <= $now ) {
			$state = array( 'count' => 0, 'reset_at' => $now + $window );
		}

		if ( (int) $state['count'] >= $limit ) {
			$retry_after = max( 1, (int) $state['reset_at'] - $now );
			return new WP_Error(
				'nodera_ai_rate_limited',
				'Too many AI generation requests. Please retry shortly.',
				array( 'status' => 429, 'retryAfter' => $retry_after )
			);
		}

		$state['count'] = (int) $state['count'] + 1;
		set_transient( $key, $state, max( 1, (int) $state['reset_at'] - $now ) );
		return true;
	}
}
