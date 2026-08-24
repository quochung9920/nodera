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

	public function test_native_responsive_style_state_is_allowed(): void {
		$blocks = array( array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'content' => 'Hello' ), 'innerBlocks' => array() ) );
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array(
				array(
					'op' => 'updateAttributes',
					'stableId' => 'nd_aaaaaaaaaaaa',
					'attributes' => array( 'style' => array( '@mobile' => array( 'typography' => array( 'fontSize' => '1rem' ) ) ) ),
				),
			),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertIsArray( $result );
		$this->assertSame( '1rem', $result['candidate'][0]['attributes']['style']['@mobile']['typography']['fontSize'] );
	}

	public function test_unknown_native_style_state_is_rejected(): void {
		$blocks = array( array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'content' => 'Hello' ), 'innerBlocks' => array() ) );
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array( array( 'op' => 'updateAttributes', 'stableId' => 'nd_aaaaaaaaaaaa', 'attributes' => array( 'style' => array( '@desktop-xl' => array( 'color' => array( 'text' => 'red' ) ) ) ) ) ),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_invalid_style_state', $result->get_error_code() );
	}

	public function test_safe_core_post_data_binding_is_allowed(): void {
		$blocks = array( array( 'name' => 'core/button', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'text' => 'Read', 'url' => '#' ), 'innerBlocks' => array() ) );
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array(
				array(
					'op' => 'updateAttributes',
					'stableId' => 'nd_aaaaaaaaaaaa',
					'attributes' => array(
						'metadata' => array( 'bindings' => array( 'url' => array( 'source' => 'core/post-data', 'args' => array( 'field' => 'link' ) ) ) ),
					),
				),
			),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertIsArray( $result );
	}

	public function test_unregistered_binding_source_is_rejected(): void {
		$blocks = array( array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'content' => 'Hello' ), 'innerBlocks' => array() ) );
		$patch = array(
			'schema' => 'nodera-patch/v1',
			'target' => array( 'kind' => 'subtree', 'stableIds' => array( 'nd_aaaaaaaaaaaa' ), 'fingerprint' => TargetFingerprint::hash( $blocks ) ),
			'operations' => array(
				array(
					'op' => 'updateAttributes',
					'stableId' => 'nd_aaaaaaaaaaaa',
					'attributes' => array( 'metadata' => array( 'bindings' => array( 'content' => array( 'source' => 'evil/source', 'args' => array() ) ) ) ),
				),
			),
		);
		$result = ( new PatchValidator( new BlockContractRegistry() ) )->validate( $patch, $blocks, array( 'nd_aaaaaaaaaaaa' ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'nodera_ai_binding_not_allowed', $result->get_error_code() );
	}

	public function test_legacy_nodera_tabs_are_not_ai_authorable(): void {
		$this->assertFalse( ( new BlockContractRegistry() )->is_ai_authorable( 'nodera/tabs' ) );
		$this->assertFalse( ( new BlockContractRegistry() )->is_ai_authorable( 'nodera/accordion' ) );
		$this->assertTrue( ( new BlockContractRegistry() )->is_ai_authorable( 'core/tabs' ) );
		$this->assertTrue( ( new BlockContractRegistry() )->is_ai_authorable( 'core/accordion' ) );
	}
}
