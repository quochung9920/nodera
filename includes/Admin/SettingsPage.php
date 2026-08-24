<?php
/**
 * Nodera settings page.
 *
 * @package Nodera
 */

namespace Nodera\Admin;

use Nodera\AI\ProviderManager;

/**
 * Provides an intentionally small server-side AI provider configuration UI.
 */
final class SettingsPage {
	public function __construct( private ProviderManager $providers ) {}

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( NODERA_FILE ), array( $this, 'action_links' ) );
	}

	public function menu(): void {
		add_options_page(
			'Nodera',
			'Nodera',
			'manage_options',
			'nodera',
			array( $this, 'render' )
		);
	}

	public function action_links( array $links ): array {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=nodera' ) ) . '">' . esc_html__( 'Settings', 'nodera' ) . '</a>' );
		return $links;
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$notice = null;
		if ( 'POST' === ( $_SERVER['REQUEST_METHOD'] ?? '' ) && isset( $_POST['nodera_ai_settings_nonce'] ) ) {
			check_admin_referer( 'nodera_ai_settings', 'nodera_ai_settings_nonce' );
			$provider = sanitize_key( wp_unslash( $_POST['provider'] ?? 'none' ) );
			$model    = sanitize_text_field( wp_unslash( $_POST['model'] ?? '' ) );
			$endpoint = esc_url_raw( wp_unslash( $_POST['endpoint'] ?? '' ) );
			if ( ! in_array( $provider, array( 'none', 'openai', 'anthropic', 'gemini', 'custom' ), true ) ) {
				$provider = 'none';
			}
			update_option( ProviderManager::OPTION_PROVIDER, $provider, false );
			update_option( ProviderManager::OPTION_MODEL, $model, false );
			update_option( ProviderManager::OPTION_ENDPOINT, $endpoint, false );

			if ( ! defined( 'NODERA_AI_API_KEY' ) ) {
				if ( ! empty( $_POST['clear_api_key'] ) ) {
					delete_option( ProviderManager::OPTION_API_KEY );
				} else {
					$api_key = trim( (string) wp_unslash( $_POST['api_key'] ?? '' ) );
					if ( '' !== $api_key ) {
						update_option( ProviderManager::OPTION_API_KEY, $api_key, false );
					}
				}
			}

			$notice = array( 'success', __( 'Nodera AI settings saved.', 'nodera' ) );
			if ( isset( $_POST['test_provider'] ) ) {
				$test = $this->providers->test_connection();
				$notice = is_wp_error( $test )
					? array( 'error', $test->get_error_message() )
					: array( 'success', __( 'Provider connection succeeded.', 'nodera' ) );
			}
		}

		$status   = $this->providers->status();
		$provider = (string) get_option( ProviderManager::OPTION_PROVIDER, 'none' );
		$model    = (string) get_option( ProviderManager::OPTION_MODEL, '' );
		$endpoint = (string) get_option( ProviderManager::OPTION_ENDPOINT, '' );
		if ( defined( 'NODERA_AI_PROVIDER' ) ) {
			$provider = (string) NODERA_AI_PROVIDER;
		}
		if ( defined( 'NODERA_AI_MODEL' ) ) {
			$model = (string) NODERA_AI_MODEL;
		}
		if ( defined( 'NODERA_AI_ENDPOINT' ) ) {
			$endpoint = (string) NODERA_AI_ENDPOINT;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Nodera', 'nodera' ); ?></h1>
			<p><?php esc_html_e( 'Configure an optional server-side AI provider. API keys are never sent to the Gutenberg browser runtime.', 'nodera' ); ?></p>
			<?php if ( $notice ) : ?>
				<div class="notice notice-<?php echo esc_attr( $notice[0] ); ?> is-dismissible"><p><?php echo esc_html( $notice[1] ); ?></p></div>
			<?php endif; ?>
			<table class="widefat striped" style="max-width:760px;margin:16px 0">
				<tbody>
					<tr><td><strong><?php esc_html_e( 'Nodera version', 'nodera' ); ?></strong></td><td><?php echo esc_html( NODERA_VERSION ); ?></td></tr>
					<tr><td><strong><?php esc_html_e( 'Provider status', 'nodera' ); ?></strong></td><td><?php echo ! empty( $status['configured'] ) ? esc_html__( 'Configured', 'nodera' ) : esc_html__( 'Not configured', 'nodera' ); ?></td></tr>
					<tr><td><strong><?php esc_html_e( 'API key source', 'nodera' ); ?></strong></td><td><?php echo esc_html( (string) $status['keySource'] ); ?></td></tr>
			</tbody>
			</table>

			<form method="post" autocomplete="off">
				<?php wp_nonce_field( 'nodera_ai_settings', 'nodera_ai_settings_nonce' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="nodera-provider"><?php esc_html_e( 'AI provider', 'nodera' ); ?></label></th>
						<td>
							<select id="nodera-provider" name="provider" <?php disabled( defined( 'NODERA_AI_PROVIDER' ) ); ?>>
								<?php foreach ( array( 'none' => 'None / manual fallback', 'openai' => 'OpenAI', 'anthropic' => 'Anthropic', 'gemini' => 'Google Gemini', 'custom' => 'Custom HTTPS endpoint' ) as $value => $label ) : ?>
									<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $provider, $value ); ?>><?php echo esc_html( $label ); ?></option>
								<?php endforeach; ?>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="nodera-model"><?php esc_html_e( 'Model', 'nodera' ); ?></label></th>
						<td><input id="nodera-model" class="regular-text" name="model" value="<?php echo esc_attr( $model ); ?>" <?php disabled( defined( 'NODERA_AI_MODEL' ) ); ?>><p class="description"><?php esc_html_e( 'Use a model available to your provider account. Nodera does not hard-code a model lifecycle.', 'nodera' ); ?></p></td>
					</tr>
					<tr>
						<th scope="row"><label for="nodera-endpoint"><?php esc_html_e( 'Custom endpoint', 'nodera' ); ?></label></th>
						<td><input id="nodera-endpoint" type="url" class="regular-text" name="endpoint" placeholder="https://example.com/nodera" value="<?php echo esc_attr( $endpoint ); ?>" <?php disabled( defined( 'NODERA_AI_ENDPOINT' ) ); ?>><p class="description"><?php esc_html_e( 'Used only for the Custom provider. HTTPS is required and WordPress safe HTTP validation is enforced.', 'nodera' ); ?></p></td>
					</tr>
					<tr>
						<th scope="row"><label for="nodera-api-key"><?php esc_html_e( 'API key', 'nodera' ); ?></label></th>
						<td>
							<?php if ( defined( 'NODERA_AI_API_KEY' ) ) : ?>
								<p><strong><?php esc_html_e( 'Managed by NODERA_AI_API_KEY in wp-config.php.', 'nodera' ); ?></strong></p>
							<?php else : ?>
								<input id="nodera-api-key" type="password" class="regular-text" name="api_key" value="" autocomplete="new-password" placeholder="<?php echo ! empty( $status['hasApiKey'] ) ? esc_attr__( 'Key is already stored — leave blank to keep it', 'nodera' ) : ''; ?>">
								<label style="display:block;margin-top:8px"><input type="checkbox" name="clear_api_key" value="1"> <?php esc_html_e( 'Clear stored API key', 'nodera' ); ?></label>
							<?php endif; ?>
						</td>
					</tr>
				</table>
				<p class="submit">
					<button type="submit" class="button button-primary"><?php esc_html_e( 'Save Settings', 'nodera' ); ?></button>
					<button type="submit" class="button" name="test_provider" value="1"><?php esc_html_e( 'Save & Test Provider', 'nodera' ); ?></button>
				</p>
			</form>
			<h2><?php esc_html_e( 'Recommended production configuration', 'nodera' ); ?></h2>
			<p><?php esc_html_e( 'For production, define NODERA_AI_PROVIDER, NODERA_AI_MODEL and NODERA_AI_API_KEY in server configuration or wp-config.php so the credential is not editable in wp-admin.', 'nodera' ); ?></p>
		</div>
		<?php
	}
}
