<?php
/** @package Nodera */

use Nodera\AI\ContextSanitizer;
use PHPUnit\Framework\TestCase;

final class ContextSanitizerTest extends TestCase {
	public function test_recursively_removes_secrets_and_preserves_editor_data(): void {
		$context = array(
			'schema' => 'nodera-ai-context/v1',
			'task' => array( 'request' => 'Improve heading' ),
			'document' => array(
				'scopeTree' => array(
					array(
						'name' => 'core/heading',
						'attributes' => array(
							'content' => 'Hello',
							'apiKey' => 'must-not-leave-wordpress',
						),
						'innerBlocks' => array(),
					),
				),
			),
			'environment' => array(
				'authorization' => 'Bearer secret',
				'wordpressVersion' => '7.1',
			),
		);
		$result = ContextSanitizer::sanitize( $context );
		$this->assertIsArray( $result );
		$this->assertSame( 'Hello', $result['document']['scopeTree'][0]['attributes']['content'] );
		$this->assertArrayNotHasKey( 'apiKey', $result['document']['scopeTree'][0]['attributes'] );
		$this->assertArrayNotHasKey( 'authorization', $result['environment'] );
		$this->assertSame( '7.1', $result['environment']['wordpressVersion'] );
	}

	public function test_rejects_excessive_nesting(): void {
		$value = 'deep';
		for ( $i = 0; $i < 20; ++$i ) {
			$value = array( 'level' => $value );
		}
		$result = ContextSanitizer::sanitize(
			array(
				'schema' => 'nodera-ai-context/v1',
				'context' => $value,
			)
		);
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_context_too_deep', $result->get_error_code() );
	}

	public function test_truncates_oversized_strings(): void {
		$result = ContextSanitizer::sanitize(
			array(
				'schema' => 'nodera-ai-context/v1',
				'task' => array( 'request' => str_repeat( 'x', 25000 ) ),
			)
		);
		$this->assertIsArray( $result );
		$this->assertSame( 20000, strlen( $result['task']['request'] ) );
	}
}
