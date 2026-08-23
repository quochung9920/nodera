<?php
use Nodera\AI\TargetFingerprint;
use PHPUnit\Framework\TestCase;

final class TargetFingerprintTest extends TestCase {
	public function test_transient_client_id_does_not_change_fingerprint(): void {
		$a = [ [ 'blockName' => 'core/heading', 'attrs' => [ 'noderaId' => 'nd_abcdefghijkl' ], 'clientId' => 'one', 'innerBlocks' => [] ] ];
		$b = $a; $b[0]['clientId'] = 'two';
		self::assertSame( TargetFingerprint::hash( $a ), TargetFingerprint::hash( $b ) );
	}
	public function test_content_change_changes_fingerprint(): void {
		$a = [ [ 'blockName' => 'core/heading', 'attrs' => [ 'content' => 'A' ], 'innerBlocks' => [] ] ];
		$b = [ [ 'blockName' => 'core/heading', 'attrs' => [ 'content' => 'B' ], 'innerBlocks' => [] ] ];
		self::assertNotSame( TargetFingerprint::hash( $a ), TargetFingerprint::hash( $b ) );
	}
}
