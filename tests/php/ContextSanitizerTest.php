<?php

use Nodera\AI\ContextSanitizer;
use Nodera\Contracts\BlockContractRegistry;
use PHPUnit\Framework\TestCase;

final class ContextSanitizerTest extends TestCase {
	public function test_redacts_secrets_and_filters_unknown_block_attributes(): void {
		$context = array(
			'schema' => 'nodera-ai-context/v1',
			'task' => array( 'request' => 'Improve section' ),
			'document' => array(
				'scopeTree' => array(
					array(
						'name' => 'third-party/widget',
						'attributes' => array( 'noderaId' => 'nd_123456789012', 'secretToken' => 'do-not-send', 'vendorBlob' => 'private' ),
						'innerBlocks' => array(),
					),
				),
			),
			'environment' => array( 'api_key' => 'secret', 'nonce' => 'nonce-value', 'wordpressVersion' => '7.1' ),
			'nativeWordPress' => array( 'responsiveStyleStates' => array( '@tablet', '@mobile' ) ),
			'unexpectedRoot' => 'remove-me',
		);
		$result = ( new ContextSanitizer( new BlockContractRegistry() ) )->sanitize( $context );
		$this->assertArrayNotHasKey( 'unexpectedRoot', $result );
		$this->assertSame( '[redacted]', $result['environment']['api_key'] );
		$this->assertSame( '[redacted]', $result['environment']['nonce'] );
		$this->assertSame( array( 'noderaId' => 'nd_123456789012' ), $result['document']['scopeTree'][0]['attributes'] );
		$this->assertSame( array( '@tablet', '@mobile' ), $result['nativeWordPress']['responsiveStyleStates'] );
	}

	public function test_contract_known_attributes_are_preserved_but_nested_secret_keys_are_redacted(): void {
		$context = array(
			'schema' => 'nodera-ai-context/v1',
			'document' => array(
				'scopeTree' => array(
					array(
						'name' => 'core/paragraph',
						'attributes' => array(
							'noderaId' => 'nd_abcdefghijkl',
							'content' => 'Hello',
							'metadata' => array( 'authorization' => 'Bearer x', 'safe' => 'value' ),
						),
						'innerBlocks' => array(),
					),
				),
			),
		);
		$result = ( new ContextSanitizer( new BlockContractRegistry() ) )->sanitize( $context );
		$attrs = $result['document']['scopeTree'][0]['attributes'];
		$this->assertSame( 'Hello', $attrs['content'] );
		$this->assertSame( '[redacted]', $attrs['metadata']['authorization'] );
		$this->assertSame( 'value', $attrs['metadata']['safe'] );
	}

	public function test_visual_media_and_css_urls_drop_query_credentials(): void {
		$context = array(
			'schema' => 'nodera-ai-context/v1',
			'visualFacts' => array(
				'viewports' => array(
					'desktop' => array(
						'nodes' => array(
							'nd_abcdefghijkl' => array(
								'media' => array( 'src' => 'https://cdn.example.com/media/hero.jpg?token=secret&expires=9#frag' ),
								'styles' => array( 'background-image' => 'url("https://cdn.example.com/background.webp?signature=secret#x")' ),
							),
						),
					),
				),
			),
		);
		$result = ( new ContextSanitizer( new BlockContractRegistry() ) )->sanitize( $context );
		$node = $result['visualFacts']['viewports']['desktop']['nodes']['nd_abcdefghijkl'];
		$this->assertSame( 'https://cdn.example.com/media/hero.jpg', $node['media']['src'] );
		$this->assertSame( 'url("https://cdn.example.com/background.webp")', $node['styles']['background-image'] );
	}
}
