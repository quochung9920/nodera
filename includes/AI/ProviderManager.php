<?php
/**
 * Server-side AI provider management.
 *
 * @package Nodera
 */

namespace Nodera\AI;

use WP_Error;

/**
 * Keeps provider credentials server-side and returns decoded nodera-patch/v1 payloads.
 */
final class ProviderManager {
	public const OPTION_PROVIDER = 'nodera_ai_provider';
	public const OPTION_MODEL    = 'nodera_ai_model';
	public const OPTION_ENDPOINT = 'nodera_ai_endpoint';
	public const OPTION_API_KEY  = 'nodera_ai_api_key';

	/**
	 * Public, non-secret provider status.
	 */
	public function status(): array {
		$provider = $this->provider();
		$model    = $this->model();
		$endpoint = $this->endpoint();
		$key      = $this->api_key();
		$needs_key = in_array( $provider, array( 'openai', 'anthropic', 'gemini' ), true );
		$configured = 'none' !== $provider
			&& ( 'custom' !== $provider || '' !== $endpoint )
			&& ( 'custom' === $provider || '' !== $model )
			&& ( ! $needs_key || '' !== $key );

		return array(
			'provider'   => $provider,
			'model'      => $model,
			'endpoint'   => 'custom' === $provider ? $endpoint : '',
			'configured' => $configured,
			'hasApiKey'  => '' !== $key,
			'keySource'  => defined( 'NODERA_AI_API_KEY' ) && '' !== (string) NODERA_AI_API_KEY ? 'constant' : ( '' !== $key ? 'database' : 'none' ),
		);
	}

	/**
	 * Generate a patch from a sanitized provider body.
	 *
	 * @return array|WP_Error
	 */
	public function generate( array $body ): array|WP_Error {
		$status = $this->status();
		if ( empty( $status['configured'] ) ) {
			return new WP_Error(
				'nodera_ai_provider_unavailable',
				'No direct AI provider is configured. Configure Nodera AI under Settings → Nodera or use the manual external-AI fallback.',
				array( 'status' => 501 )
			);
		}
		$context = is_array( $body['context'] ?? null ) ? $body['context'] : array();
		$prompt  = $this->prompt( $context );
		$text    = $this->request_text( $prompt, false, $body );
		if ( is_wp_error( $text ) ) {
			return $text;
		}
		return $this->decode_patch_text( $text );
	}

	/**
	 * Perform a small explicit connection probe from the settings page.
	 *
	 * @return true|WP_Error
	 */
	public function test_connection(): true|WP_Error {
		if ( empty( $this->status()['configured'] ) ) {
			return new WP_Error( 'nodera_ai_provider_unavailable', 'Provider configuration is incomplete.' );
		}
		$result = $this->request_text( 'Reply with exactly the word OK.', true, array() );
		return is_wp_error( $result ) ? $result : true;
	}

	private function provider(): string {
		$value = defined( 'NODERA_AI_PROVIDER' ) ? (string) NODERA_AI_PROVIDER : (string) get_option( self::OPTION_PROVIDER, 'none' );
		return in_array( $value, array( 'none', 'openai', 'anthropic', 'gemini', 'custom' ), true ) ? $value : 'none';
	}

	private function model(): string {
		$value = defined( 'NODERA_AI_MODEL' ) ? (string) NODERA_AI_MODEL : (string) get_option( self::OPTION_MODEL, '' );
		return sanitize_text_field( $value );
	}

	private function endpoint(): string {
		$value = defined( 'NODERA_AI_ENDPOINT' ) ? (string) NODERA_AI_ENDPOINT : (string) get_option( self::OPTION_ENDPOINT, '' );
		return esc_url_raw( $value );
	}

	private function api_key(): string {
		$value = defined( 'NODERA_AI_API_KEY' ) ? (string) NODERA_AI_API_KEY : (string) get_option( self::OPTION_API_KEY, '' );
		return trim( $value );
	}

	private function prompt( array $context ): string {
		return implode(
			"\n",
			array(
				'You are editing a native WordPress Gutenberg document through Nodera.',
				'Use only authorable full block contracts supplied in the context.',
				'Do not invent block attributes or edit outside the target scope.',
				'Return exactly one nodera-patch/v1 JSON object and no prose or Markdown.',
				'Every newly authored block must include a unique valid noderaId.',
				'Prefer native Gutenberg block supports, responsive style states, pseudo states, Block Bindings, Core Tabs and Core Accordion over custom CSS or legacy Nodera blocks.',
				'',
				(string) wp_json_encode( $context, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ),
			)
		);
	}

	/**
	 * Send provider request and return response text.
	 *
	 * @return string|WP_Error
	 */
	private function request_text( string $prompt, bool $probe, array $provider_body ): string|WP_Error {
		$provider = $this->provider();
		$model    = $this->model();
		$key      = $this->api_key();
		$headers  = array( 'Content-Type' => 'application/json' );
		$payload  = array();
		$url      = '';

		switch ( $provider ) {
			case 'openai':
				$url = 'https://api.openai.com/v1/responses';
				$headers['Authorization'] = 'Bearer ' . $key;
				$payload = array(
					'model'             => $model,
					'input'             => $prompt,
					'max_output_tokens' => $probe ? 32 : 16000,
				);
				break;
			case 'anthropic':
				$url = 'https://api.anthropic.com/v1/messages';
				$headers['x-api-key'] = $key;
				$headers['anthropic-version'] = '2023-06-01';
				$payload = array(
					'model'      => $model,
					'max_tokens' => $probe ? 32 : 16000,
					'messages'   => array( array( 'role' => 'user', 'content' => $prompt ) ),
				);
				break;
			case 'gemini':
				$model_name = preg_replace( '#^models/#', '', $model );
				$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode( (string) $model_name ) . ':generateContent';
				$headers['x-goog-api-key'] = $key;
				$payload = array(
					'contents' => array( array( 'role' => 'user', 'parts' => array( array( 'text' => $prompt ) ) ) ),
				);
				if ( ! $probe ) {
					$payload['generationConfig'] = array( 'responseMimeType' => 'application/json' );
				}
				break;
			case 'custom':
				$url = $this->endpoint();
				if ( ! $this->is_safe_custom_endpoint( $url ) ) {
					return new WP_Error( 'nodera_ai_unsafe_endpoint', 'Custom AI endpoint must be a valid HTTPS URL.', array( 'status' => 400 ) );
				}
				if ( '' !== $key ) {
					$headers['Authorization'] = 'Bearer ' . $key;
				}
				$payload = $probe
					? array( 'schema' => 'nodera-provider-test/v1', 'prompt' => $prompt )
					: array( 'schema' => 'nodera-provider-request/v1', 'prompt' => $prompt, 'context' => $provider_body['context'] ?? array() );
				break;
			default:
				return new WP_Error( 'nodera_ai_provider_unavailable', 'No direct AI provider is configured.', array( 'status' => 501 ) );
		}

		$response = wp_safe_remote_post(
			$url,
			array(
				'timeout'     => $probe ? 20 : 90,
				'redirection' => 2,
				'headers'     => $headers,
				'body'        => wp_json_encode( $payload ),
				'user-agent'  => 'Nodera/' . NODERA_VERSION . '; ' . home_url( '/' ),
			)
		);
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'nodera_ai_provider_transport', 'Could not reach the configured AI provider.', array( 'status' => 502 ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return new WP_Error(
				'nodera_ai_provider_http',
				'AI provider returned an unsuccessful HTTP response.',
				array( 'status' => 502, 'providerStatus' => $code, 'provider' => $provider )
			);
		}
		$raw  = (string) wp_remote_retrieve_body( $response );
		$json = json_decode( $raw, true );
		if ( ! is_array( $json ) ) {
			return new WP_Error( 'nodera_ai_provider_invalid_json', 'AI provider returned invalid JSON.', array( 'status' => 502 ) );
		}
		if ( $probe ) {
			return 'OK';
		}
		if ( 'custom' === $provider ) {
			if ( 'nodera-patch/v1' === ( $json['schema'] ?? null ) ) {
				return (string) wp_json_encode( $json );
			}
			if ( is_array( $json['patch'] ?? null ) ) {
				return (string) wp_json_encode( $json['patch'] );
			}
			if ( is_string( $json['text'] ?? null ) ) {
				return $json['text'];
			}
			return new WP_Error( 'nodera_ai_provider_invalid_response', 'Custom endpoint must return a Nodera patch, a patch object, or a text field.', array( 'status' => 502 ) );
		}
		$text = match ( $provider ) {
			'openai'    => $this->openai_text( $json ),
			'anthropic' => $this->anthropic_text( $json ),
			'gemini'    => $this->gemini_text( $json ),
			default     => '',
		};
		return '' !== $text ? $text : new WP_Error( 'nodera_ai_provider_empty', 'AI provider returned no usable text output.', array( 'status' => 502 ) );
	}

	/**
	 * Decode a provider text response into a patch.
	 *
	 * @return array|WP_Error
	 */
	private function decode_patch_text( string $text ): array|WP_Error {
		$clean = trim( preg_replace( '/^```(?:json)?\s*|\s*```$/i', '', trim( $text ) ) ?? trim( $text ) );
		$patch = json_decode( $clean, true );
		if ( ! is_array( $patch ) ) {
			$first = strpos( $clean, '{' );
			$last  = strrpos( $clean, '}' );
			if ( false !== $first && false !== $last && $last > $first ) {
				$patch = json_decode( substr( $clean, $first, $last - $first + 1 ), true );
			}
		}
		if ( ! is_array( $patch ) ) {
			return new WP_Error( 'nodera_ai_provider_invalid_patch', 'AI provider did not return a valid JSON patch.', array( 'status' => 502 ) );
		}
		return $patch;
	}

	private function openai_text( array $json ): string {
		if ( is_string( $json['output_text'] ?? null ) ) {
			return $json['output_text'];
		}
		foreach ( (array) ( $json['output'] ?? array() ) as $item ) {
			foreach ( (array) ( $item['content'] ?? array() ) as $content ) {
				if ( is_string( $content['text'] ?? null ) ) {
					return $content['text'];
				}
			}
		}
		return '';
	}

	private function anthropic_text( array $json ): string {
		foreach ( (array) ( $json['content'] ?? array() ) as $content ) {
			if ( 'text' === ( $content['type'] ?? '' ) && is_string( $content['text'] ?? null ) ) {
				return $content['text'];
			}
		}
		return '';
	}

	private function gemini_text( array $json ): string {
		$parts = $json['candidates'][0]['content']['parts'] ?? array();
		foreach ( (array) $parts as $part ) {
			if ( is_string( $part['text'] ?? null ) ) {
				return $part['text'];
			}
		}
		return '';
	}

	private function is_safe_custom_endpoint( string $url ): bool {
		if ( '' === $url || 'https' !== strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) ) ) {
			return false;
		}
		return false !== wp_http_validate_url( $url );
	}
}
