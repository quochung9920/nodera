<?php
/** @package Nodera */

use Nodera\AI\PatchValidator;
use Nodera\AI\TargetFingerprint;
use Nodera\Contracts\BlockContractRegistry;
use PHPUnit\Framework\TestCase;

final class PatchValidatorTest extends TestCase {
	private function blocks(): array {
		return array(
			array(
				'name' => 'core/group',
				'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa' ),
				'innerBlocks' => array(
					array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_bbbbbbbbbbbb', 'content' => 'Hello' ), 'innerBlocks' => array() ),
				),
			),
		);
	}

	private function patch( array $blocks, array $operations ): array {
		return array(
			'schema' => 'nodera-patch/v1',
			'target' => array(
				'kind' => 'subtree',
				'stableIds' => array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' ),
				'fingerprint' => TargetFingerprint::hash( $blocks ),
			),
			'operations' => $operations,
		);
	}

	public function test_valid_update_builds_candidate(): void {
		$blocks = $this->blocks();
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate(
			$this->patch( $blocks, array( array( 'op' => 'updateAttributes', 'stableId' => 'nd_bbbbbbbbbbbb', 'attributes' => array( 'content' => 'Updated' ) ) ) ),
			$blocks,
			array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' )
		);
		$this->assertIsArray( $result );
		$this->assertSame( 'Updated', $result['candidate'][0]['innerBlocks'][0]['attributes']['content'] );
	}

	public function test_stale_fingerprint_is_rejected(): void {
		$blocks = $this->blocks();
		$patch = $this->patch( $blocks, array() );
		$patch['target']['fingerprint'] = str_repeat( '0', 64 );
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_target_changed', $result->get_error_code() );
	}

	public function test_scope_escape_is_rejected(): void {
		$blocks = $this->blocks();
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate(
			$this->patch( $blocks, array( array( 'op' => 'removeBlock', 'stableId' => 'nd_cccccccccccc' ) ) ),
			$blocks,
			array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' )
		);
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_scope_escape', $result->get_error_code() );
	}

	public function test_unsafe_html_block_is_rejected(): void {
		$blocks = $this->blocks();
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate(
			$this->patch( $blocks, array( array( 'op' => 'replaceBlock', 'stableId' => 'nd_bbbbbbbbbbbb', 'block' => array( 'name' => 'core/html', 'attributes' => array( 'noderaId' => 'nd_bbbbbbbbbbbb', 'content' => '<script>x</script>' ), 'innerBlocks' => array() ) ) ),
			$blocks,
			array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' )
		);
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_block_not_allowed', $result->get_error_code() );
	}

	public function test_scoped_root_insert_is_rejected(): void {
		$blocks = $this->blocks();
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate(
			$this->patch( $blocks, array( array( 'op' => 'insertBlock', 'parentStableId' => null, 'index' => 0, 'block' => array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_cccccccccccc', 'content' => 'Outside' ), 'innerBlocks' => array() ) ) ),
			$blocks,
			array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' )
		);
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_scope_escape', $result->get_error_code() );
	}

	public function test_move_into_descendant_is_rejected(): void {
		$blocks = $this->blocks();
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate(
			$this->patch( $blocks, array( array( 'op' => 'moveBlock', 'stableId' => 'nd_aaaaaaaaaaaa', 'toParentStableId' => 'nd_bbbbbbbbbbbb', 'index' => 0 ) ) ),
			$blocks,
			array( 'nd_aaaaaaaaaaaa', 'nd_bbbbbbbbbbbb' )
		);
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_invalid_move', $result->get_error_code() );
	}

	public function test_unsafe_url_is_rejected(): void {
		$registry = WP_Block_Type_Registry::get_instance();
		$registry->register_test_type(
			'core/button',
			array(
				'noderaId' => array( 'type' => 'string' ),
				'text' => array( 'type' => 'string' ),
				'url' => array( 'type' => 'string' ),
			)
		);
		$blocks = array( array( 'name' => 'core/button', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'text' => 'Go', 'url' => 'https://example.com' ), 'innerBlocks' => array() ) );
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array( array( 'op' => 'updateAttributes', 'stableId' => 'nd_aaaaaaaaaaaa', 'attributes' => array( 'url' => 'javascript:alert(1)' ) ) ),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_unsafe_url', $result->get_error_code() );
	}
}
