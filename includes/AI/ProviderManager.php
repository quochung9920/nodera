<?php
/**
 * Server-side AI provider configuration and adapters.
 *
 * @package Nodera
 */

namespace Nodera\AI;

use Nodera\Contracts\BlockContractRegistry;
use WP_Error;
use WP_REST_Request;

final class ProviderManager {
	public const OPTION = 'nodera_ai_provider';
	private const MAX_RESPONSE_BYTES = 2097152;
	private const DEFAULT_TIMEOUT = 45;

	public function __construct( private BlockContractRegistry $contracts ) {}

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'settings' ) );
		add_filter( 'nodera_ai_generate_patch', array( $this, 'generate' ), 10, 3 );
	}

	public function public_status(): array {
		$settings = $this->get();
		return array(
			'configured' => 'none' !== $settings['provider'] && '' !== $settings['api_key'],
			'provider'   => $settings['provider'],
			'model'      => $settings['model'],
			'source'     => $settings['source'],
		);
	}

	public function settings(): void {
		register_setting(
			'nodera_ai',
			self::OPTION,
			array(
				'type' => 'array',
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default' => array(),
			)
		);
	}

	public function menu(): void {
		add_options_page( 'Nodera AI', 'Nodera AI', 'manage_options', 'nodera-ai', array( $this, 'page' ) );
	}

	public function sanitize_settings( mixed $input ): array {
		$old = $this->stored();
		$input = is_array( $input ) ? $input : array();
		$provider = sanitize_key( (string) ( $input['provider'] ?? 'none' ) );
		if ( ! in_array( $provider, array( 'none', 'openai', 'anthropic', 'gemini', 'openai_compatible' ), true ) ) {
			$provider = 'none';
		}
		$api_key = trim( (string) ( $input['api_key'] ?? '' ) );
		if ( '' === $api_key && empty( $input['clear_api_key'] ) ) {
			$api_key = $old['api_key'];
		}
		if ( ! empty( $input['clear_api_key'] ) ) {
			$api_key = '';
		}
		$api_key = preg_replace( '/[\x00-\x1F\x7F]/', '', $api_key ) ?? '';
		$api_key = substr( $api_key, 0, 512 );
		$model = substr( sanitize_text_field( (string) ( $input['model'] ?? '' ) ), 0, 160 );
		$endpoint = substr( esc_url_raw( (string) ( $input['endpoint'] ?? '' ) ), 0, 2048 );
		if ( '' !== $endpoint && ! str_starts_with( strtolower( $endpoint ), 'https://' ) ) {
			$endpoint = '';
		}
		return array(
			'provider' => $provider,
			'api_key'  => $api_key,
			'model'    => $model,
			'endpoint' => $endpoint,
		);
	}

	public function page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s = $this->get();
		$stored = $this->stored();
		$constant_source = 'constant' === $s['source'];
		?>
		<div class="wrap"><h1><?php echo esc_html__( 'Nodera AI Provider', 'nodera' ); ?></h1>
		<p><?php echo esc_html__( 'Credentials stay server-side. For production deployments, wp-config.php constants can override database settings.', 'nodera' ); ?></p>
		<?php if ( $constant_source ) : ?>
		<p><strong><?php echo esc_html__( 'Configuration source: wp-config.php constants.', 'nodera' ); ?></strong> <?php echo esc_html__( 'Saved database values remain unchanged but are not used while constants are defined.', 'nodera' ); ?></p>
		<?php endif; ?>
		<form method="post" action="options.php">
			<?php settings_fields( 'nodera_ai' ); ?>
			<table class="form-table"><tbody>
			<tr><th><label for="nodera-provider"><?php echo esc_html__( 'Provider', 'nodera' ); ?></label></th><td><select id="nodera-provider" name="<?php echo esc_attr( self::OPTION ); ?>[provider]">
			<?php foreach ( array( 'none' => 'None / manual fallback', 'openai' => 'OpenAI', 'anthropic' => 'Anthropic', 'gemini' => 'Google Gemini', 'openai_compatible' => 'OpenAI-compatible endpoint' ) as $value => $label ) : ?>
			<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $stored['provider'], $value ); ?>><?php echo esc_html( $label ); ?></option>
			<?php endforeach; ?></select></td></tr>
			<tr><th><label for="nodera-model"><?php echo esc_html__( 'Model', 'nodera' ); ?></label></th><td><input class="regular-text" id="nodera-model" name="<?php echo esc_attr( self::OPTION ); ?>[model]" value="<?php echo esc_attr( $stored['model'] ); ?>" /></td></tr>
			<tr><th><label for="nodera-key"><?php echo esc_html__( 'API key', 'nodera' ); ?></label></th><td><input class="regular-text" type="password" autocomplete="new-password" id="nodera-key" name="<?php echo esc_attr( self::OPTION ); ?>[api_key]" value="" placeholder="<?php echo $stored['api_key'] ? esc_attr__( 'Saved — enter a value only to replace it', 'nodera' ) : ''; ?>" /><br><label><input type="checkbox" name="<?php echo esc_attr( self::OPTION ); ?>[clear_api_key]" value="1"> <?php echo esc_html__( 'Clear saved key', 'nodera' ); ?></label></td></tr>
			<tr><th><label for="nodera-endpoint"><?php echo esc_html__( 'Custom endpoint', 'nodera' ); ?></label></th><td><input class="regular-text code" id="nodera-endpoint" name="<?php echo esc_attr( self::OPTION ); ?>[endpoint]" value="<?php echo esc_attr( $stored['endpoint'] ); ?>" placeholder="https://example.com/v1/chat/completions" /><p class="description"><?php echo esc_html__( 'Used only for OpenAI-compatible mode. HTTPS and WordPress safe-URL validation are required.', 'nodera' ); ?></p></td></tr>
			</tbody></table><?php submit_button(); ?>
		</form>
		<h2><?php echo esc_html__( 'Production constants', 'nodera' ); ?></h2>
		<pre><code>define( 'NODERA_AI_PROVIDER', 'openai' );
define( 'NODERA_AI_MODEL', 'your-model' );
define( 'NODERA_AI_API_KEY', '...' );
// Optional for openai_compatible only:
define( 'NODERA_AI_ENDPOINT', 'https://example.com/v1/chat/completions' );</code></pre>
		</div>
		<?php
	}

	public function generate( mixed $patch, array $body, WP_REST_Request $request ): array|WP_Error|null {
		unset( $patch, $request );
		$s = $this->get();
		if ( 'none' === $s['provider'] || '' === $s['api_key'] ) {
			return null;
		}
		$context = is_array( $body['context'] ?? null ) ? ( new ContextSanitizer( $this->contracts ) )->sanitize( $body['context'] ) : array();
		$prompt = $this->prompt( $context );
		if ( strlen( $prompt ) > 700000 ) {
			return new WP_Error( 'nodera_ai_context_too_large', 'Sanitized AI context is too large.', array( 'status' => 413 ) );
		}
		$response = match ( $s['provider'] ) {
			'openai' => $this->openai( $s, $prompt ),
			'anthropic' => $this->anthropic( $s, $prompt ),
			'gemini' => $this->gemini( $s, $prompt ),
			'openai_compatible' => $this->compatible( $s, $prompt ),
			default => new WP_Error( 'nodera_ai_provider_invalid', 'Unsupported AI provider.', array( 'status' => 400 ) ),
		};
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$decoded = $this->decode_patch( $response );
		return is_array( $decoded ) ? $decoded : new WP_Error( 'nodera_ai_provider_invalid_json', 'The AI provider did not return valid nodera-patch/v1 JSON.', array( 'status' => 502 ) );
	}

	private function stored(): array {
		$value = get_option( self::OPTION, array() );
		$value = is_array( $value ) ? $value : array();
		return wp_parse_args( $value, array( 'provider' => 'none', 'api_key' => '', 'model' => '', 'endpoint' => '' ) );
	}

	private function get(): array {
		$value = $this->stored();
		$source = 'database';
		$map = array(
			'provider' => 'NODERA_AI_PROVIDER',
			'api_key'  => 'NODERA_AI_API_KEY',
			'model'    => 'NODERA_AI_MODEL',
			'endpoint' => 'NODERA_AI_ENDPOINT',
		);
		foreach ( $map as $key => $constant ) {
			if ( defined( $constant ) ) {
				$constant_value = constant( $constant );
				if ( is_string( $constant_value ) ) {
					$value[ $key ] = trim( $constant_value );
					$source = 'constant';
				}
			}
		}
		$value['provider'] = in_array( $value['provider'], array( 'none', 'openai', 'anthropic', 'gemini', 'openai_compatible' ), true ) ? $value['provider'] : 'none';
		$value['source'] = $source;
		return $value;
	}

	private function prompt( array $context ): string {
		return "You are Nodera's Gutenberg patch engine. Return ONLY one valid nodera-patch/v1 JSON object. Use only supplied contracts and target stable IDs. Never invent attributes or escape scope. Prefer native WordPress 7.1 style states (@mobile, @tablet, :hover, :focus, :focus-visible, :active) and Core blocks.\n\n" . wp_json_encode( $context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	}

	private function openai( array $s, string $prompt ): string|WP_Error {
		$model = $s['model'] ?: 'gpt-5.6';
		return $this->request_text(
			'https://api.openai.com/v1/responses',
			array( 'Authorization' => 'Bearer ' . $s['api_key'] ),
			array( 'model' => $model, 'input' => $prompt, 'store' => false, 'max_output_tokens' => 12000 ),
			static function ( array $json ): string {
				foreach ( (array) ( $json['output'] ?? array() ) as $item ) {
					foreach ( (array) ( $item['content'] ?? array() ) as $content ) {
						if ( 'output_text' === ( $content['type'] ?? '' ) && is_string( $content['text'] ?? null ) ) {
							return $content['text'];
						}
					}
				}
				return '';
			}
		);
	}

	private function anthropic( array $s, string $prompt ): string|WP_Error {
		$model = $s['model'] ?: 'claude-sonnet-4-5';
		return $this->request_text(
			'https://api.anthropic.com/v1/messages',
			array( 'x-api-key' => $s['api_key'], 'anthropic-version' => '2023-06-01' ),
			array( 'model' => $model, 'max_tokens' => 12000, 'messages' => array( array( 'role' => 'user', 'content' => $prompt ) ) ),
			static function ( array $json ): string {
				foreach ( (array) ( $json['content'] ?? array() ) as $part ) {
					if ( 'text' === ( $part['type'] ?? '' ) && is_string( $part['text'] ?? null ) ) {
						return $part['text'];
					}
				}
				return '';
			}
		);
	}

	private function gemini( array $s, string $prompt ): string|WP_Error {
		$model = preg_replace( '/[^a-zA-Z0-9._-]/', '', $s['model'] ?: 'gemini-3.7-flash' );
		return $this->request_text(
			'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode( $model ) . ':generateContent',
			array( 'x-goog-api-key' => $s['api_key'] ),
			array( 'contents' => array( array( 'parts' => array( array( 'text' => $prompt ) ) ) ), 'generationConfig' => array( 'responseMimeType' => 'application/json', 'maxOutputTokens' => 12000 ) ),
			static fn( array $json ): string => (string) ( $json['candidates'][0]['content']['parts'][0]['text'] ?? '' )
		);
	}

	private function compatible( array $s, string $prompt ): string|WP_Error {
		if ( ! wp_http_validate_url( $s['endpoint'] ) || ! str_starts_with( strtolower( $s['endpoint'] ), 'https://' ) ) {
			return new WP_Error( 'nodera_ai_endpoint_invalid', 'Custom AI endpoint must be a valid public HTTPS URL.', array( 'status' => 400 ) );
		}
		return $this->request_text(
			$s['endpoint'],
			array( 'Authorization' => 'Bearer ' . $s['api_key'] ),
			array( 'model' => $s['model'], 'messages' => array( array( 'role' => 'user', 'content' => $prompt ) ), 'response_format' => array( 'type' => 'json_object' ) ),
			static fn( array $json ): string => (string) ( $json['choices'][0]['message']['content'] ?? '' )
		);
	}

	private function request_text( string $url, array $headers, array $body, callable $extract ): string|WP_Error {
		$json_body = wp_json_encode( $body );
		if ( ! is_string( $json_body ) ) {
			return new WP_Error( 'nodera_ai_provider_encode', 'Could not encode the provider request.', array( 'status' => 500 ) );
		}
		$timeout = max( 10, min( 90, (int) apply_filters( 'nodera_ai_provider_timeout', self::DEFAULT_TIMEOUT, $url ) ) );
		$response = wp_safe_remote_post( $url, array(
			'timeout' => $timeout,
			'redirection' => 0,
			'limit_response_size' => self::MAX_RESPONSE_BYTES,
			'headers' => array_merge( array( 'Content-Type' => 'application/json' ), $headers ),
			'body' => $json_body,
			'data_format' => 'body',
		) );
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'nodera_ai_provider_transport', $response->get_error_message(), array( 'status' => 502 ) );
		}
		$status = (int) wp_remote_retrieve_response_code( $response );
		$raw = (string) wp_remote_retrieve_body( $response );
		if ( strlen( $raw ) >= self::MAX_RESPONSE_BYTES ) {
			return new WP_Error( 'nodera_ai_provider_response_too_large', 'AI provider response exceeded the maximum size.', array( 'status' => 502 ) );
		}
		if ( $status < 200 || $status >= 300 ) {
			return new WP_Error( 'nodera_ai_provider_http', 'AI provider request failed with HTTP ' . $status . '.', array( 'status' => 502 ) );
		}
		$json = json_decode( $raw, true );
		$text = is_array( $json ) ? (string) $extract( $json ) : '';
		return '' !== trim( $text ) ? $text : new WP_Error( 'nodera_ai_provider_empty', 'AI provider returned no text output.', array( 'status' => 502 ) );
	}

	private function decode_patch( string $text ): ?array {
		$text = preg_replace( '/^\xEF\xBB\xBF/', '', trim( $text ) );
		if ( preg_match( '/^```(?:json)?\s*(.*?)\s*```$/is', $text, $match ) ) {
			$text = trim( $match[1] );
		}
		$decoded = json_decode( $text, true );
		if ( is_array( $decoded ) ) {
			return $decoded;
		}
		$start = strpos( $text, '{' );
		$end = strrpos( $text, '}' );
		if ( false !== $start && false !== $end && $end > $start ) {
			$decoded = json_decode( substr( $text, $start, $end - $start + 1 ), true );
			return is_array( $decoded ) ? $decoded : null;
		}
		return null;
	}
}
