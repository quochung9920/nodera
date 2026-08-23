<?php
/** @package Nodera */

use Nodera\AI\PatchValidator;
use Nodera\AI\TargetFingerprint;
use Nodera\Contracts\BlockContractRegistry;
use PHPUnit\Framework\TestCase;

final class PatchValidatorTest extends TestCase {
	private function blocks(): array {
		return array( array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'content' => 'Hello' ), 'innerBlocks' => array() ) );
	}

	public function test_valid_update_builds_candidate(): void {
		$blocks = $this->blocks();
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array( array( 'op' => 'updateAttributes', 'stableId' => 'nd_aaaaaaaaaaaa', 'attributes' => array( 'content' => 'Updated' ) ) ),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertIsArray( $result );
		$this->assertSame( 'Updated', $result['candidate'][0]['attributes']['content'] );
	}

	public function test_stale_fingerprint_is_rejected(): void {
		$blocks = $this->blocks();
		$patch = array( 'schema' => 'nodera-patch/v1', 'target' => array( 'kind' => 'subtree', 'stableIds' => array(), 'fingerprint' => str_repeat( '0', 64 ) ), 'operations' => array() );
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_target_changed', $result->get_error_code() );
	}

	public function test_scope_escape_is_rejected(): void {
		$blocks = $this->blocks();
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array( array( 'op' => 'removeBlock', 'stableId' => 'nd_bbbbbbbbbbbb' ) ),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_scope_escape', $result->get_error_code() );
	}

	public function test_unsafe_html_block_is_rejected(): void {
		$blocks = $this->blocks();
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array( array( 'op' => 'replaceBlock', 'stableId' => 'nd_aaaaaaaaaaaa', 'block' => array( 'name' => 'core/html', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'content' => '<script>x</script>' ), 'innerBlocks' => array() ) ) ),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_block_not_allowed', $result->get_error_code() );
	}
}
