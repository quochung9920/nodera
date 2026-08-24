<?php
/**
 * Idempotent Nodera runtime migrations.
 *
 * @package Nodera
 */

namespace Nodera\Migrations;

/**
 * Tracks plugin schema changes without rewriting Gutenberg post_content.
 */
final class MigrationManager {
	public const OPTION         = 'nodera_schema_version';
	public const SCHEMA_VERSION = 1;

	/**
	 * Run lightweight migrations after WordPress has loaded plugins.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'migrate' ), 5 );
	}

	/**
	 * Advance internal option schema only. Saved Gutenberg content is never rewritten here.
	 */
	public function migrate(): void {
		$current = (int) get_option( self::OPTION, 0 );
		if ( $current >= self::SCHEMA_VERSION ) {
			return;
		}

		// Schema v1 establishes explicit migration tracking. No post_content mutation is required.
		update_option( self::OPTION, self::SCHEMA_VERSION, false );
	}

	/**
	 * Safe diagnostics payload.
	 */
	public function status(): array {
		return array(
			'installed' => (int) get_option( self::OPTION, 0 ),
			'current'   => self::SCHEMA_VERSION,
			'pending'   => (int) get_option( self::OPTION, 0 ) < self::SCHEMA_VERSION,
			'policy'    => 'no-post-content-rewrite',
		);
	}
}
