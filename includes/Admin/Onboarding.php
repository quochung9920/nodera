<?php
/**
 * Nodera onboarding and support readiness screen.
 *
 * @package Nodera
 */

namespace Nodera\Admin;

use Nodera\Commercial\EntitlementManager;
use Nodera\Compatibility\CompatibilityRegistry;
use Nodera\Protocols\ProtocolRegistry;

/**
 * Gives site owners a low-friction, non-destructive first-run and support workflow.
 */
final class Onboarding {
	public function __construct(
		private CompatibilityRegistry $compatibility,
		private ProtocolRegistry $protocols,
		private EntitlementManager $entitlement
	) {}

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'register_page' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( NODERA_FILE ), array( $this, 'action_links' ) );
	}

	public function register_page(): void {
		add_management_page(
			'Nodera Readiness',
			'Nodera',
			'edit_posts',
			'nodera-readiness',
			array( $this, 'render_page' )
		);
	}

	public function action_links( array $links ): array {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'tools.php?page=nodera-readiness' ) ) . '">Getting Started</a>' );
		return $links;
	}

	public function render_page(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		$report      = $this->compatibility->report();
		$protocol    = $this->protocols->descriptor();
		$entitlement = $this->entitlement->public_status();
		$new_page    = admin_url( 'post-new.php?post_type=page' );
		echo '<div class="wrap"><h1>Nodera Readiness</h1>';
		echo '<p>Nodera works inside Gutenberg. WordPress post_content, Save, revisions and Undo/Redo remain authoritative.</p>';
		echo '<h2>Start in five steps</h2><ol>';
		echo '<li><a href="' . esc_url( $new_page ) . '">Create or open a page in Gutenberg</a>.</li>';
		echo '<li>Select a block, subtree, or use the page-level Nodera panel.</li>';
		echo '<li>Use Copy for AI or download a portable <code>nodera-ai-export/v1</code> session.</li>';
		echo '<li>Process it with an external AI and return one <code>nodera-patch/v1</code> object.</li>';
		echo '<li>Import, Validate &amp; Preview, then explicitly Apply. Save only when satisfied.</li>';
		echo '</ol>';
		echo '<h2>Runtime readiness</h2><table class="widefat striped"><tbody>';
		$this->row( 'WordPress', (string) $report['wordpress']['version'], ! empty( $report['wordpress']['ok'] ) );
		$this->row( 'PHP', (string) $report['php']['version'], ! empty( $report['php']['ok'] ) );
		$this->row( 'Theme', (string) $report['theme']['slug'] . ' ' . (string) $report['theme']['version'], true );
		$this->row( 'Block Bindings API', ! empty( $report['capabilities']['blockBindings'] ) ? 'available' : 'unavailable', ! empty( $report['capabilities']['blockBindings'] ) );
		$this->row( 'Global Styles API', ! empty( $report['capabilities']['globalStyles'] ) ? 'available' : 'unavailable', ! empty( $report['capabilities']['globalStyles'] ) );
		$this->row( 'Interactivity API', ! empty( $report['capabilities']['interactivity'] ) ? 'available' : 'unavailable', ! empty( $report['capabilities']['interactivity'] ) );
		echo '</tbody></table>';
		echo '<h2>Portable AI protocol</h2>';
		echo '<p>Protocol <strong>' . esc_html( (string) $protocol['version'] ) . '</strong> · export <code>' . esc_html( (string) $protocol['exportSchema'] ) . '</code> · patch <code>' . esc_html( (string) $protocol['patchSchema'] ) . '</code>.</p>';
		echo '<h2>Detected integrations</h2><ul>';
		echo '<li>ACF: ' . esc_html( ! empty( $report['integrations']['acf']['active'] ) ? 'detected ' . (string) $report['integrations']['acf']['version'] : 'not detected' ) . '</li>';
		echo '<li>WooCommerce: ' . esc_html( ! empty( $report['integrations']['woocommerce']['active'] ) ? 'detected ' . (string) $report['integrations']['woocommerce']['version'] : 'not detected' ) . '</li>';
		echo '</ul>';
		echo '<p><strong>Support fingerprint:</strong> <code>' . esc_html( (string) $report['supportFingerprint'] ) . '</code>. This fingerprint contains no credentials or page content.</p>';
		echo '<h2>Commercial delivery</h2><p>Signed update service: <strong>' . esc_html( $entitlement['updateServiceConfigured'] ? 'configured' : 'not configured' ) . '</strong>. License status never gates existing Gutenberg content or editor access.</p>';
		echo '<p><a class="button" href="' . esc_url( admin_url( 'options-general.php?page=nodera-commercial' ) ) . '">Commercial settings</a></p>';
		echo '</div>';
	}

	private function row( string $label, string $value, bool $ok ): void {
		echo '<tr><th scope="row">' . esc_html( $label ) . '</th><td>' . esc_html( $value ) . '</td><td><strong>' . esc_html( $ok ? 'OK' : 'Needs attention' ) . '</strong></td></tr>';
	}
}
