<?php

use Nodera\Protocols\ProtocolRegistry;
use PHPUnit\Framework\TestCase;

final class ProtocolRegistryTest extends TestCase {
	public function test_descriptor_exposes_stable_v1_schemas(): void {
		$descriptor = ( new ProtocolRegistry() )->descriptor();
		$this->assertSame( '1.0', $descriptor['version'] );
		$this->assertSame( 'nodera-ai-context/v1', $descriptor['contextSchema'] );
		$this->assertSame( 'nodera-ai-export/v1', $descriptor['exportSchema'] );
		$this->assertSame( 'nodera-patch/v1', $descriptor['patchSchema'] );
		$this->assertContains( 'block', $descriptor['supportedScopes'] );
		$this->assertContains( 'subtree', $descriptor['supportedScopes'] );
		$this->assertContains( 'page', $descriptor['supportedScopes'] );
	}

	public function test_integrity_is_deterministic_for_object_key_order(): void {
		$registry = new ProtocolRegistry();
		$one = $registry->integrity(
			array( 'kind' => 'block', 'stableIds' => array( 'nd_abcdefghijkl' ), 'fingerprint' => str_repeat( 'a', 64 ) ),
			array( 'b' => 2, 'a' => array( 'z' => 1, 'y' => 2 ) ),
			array( 'schema' => 'nodera-patch/v1', 'rules' => array( 'one' ) )
		);
		$two = $registry->integrity(
			array( 'fingerprint' => str_repeat( 'a', 64 ), 'stableIds' => array( 'nd_abcdefghijkl' ), 'kind' => 'block' ),
			array( 'a' => array( 'y' => 2, 'z' => 1 ), 'b' => 2 ),
			array( 'rules' => array( 'one' ), 'schema' => 'nodera-patch/v1' )
		);
		$this->assertSame( 'sha256', $one['algorithm'] );
		$this->assertMatchesRegularExpression( '/^[a-f0-9]{64}$/', $one['value'] );
		$this->assertSame( $one, $two );
	}
}
