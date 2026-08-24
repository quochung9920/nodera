<?php

use Nodera\Contracts\BlockContractRegistry;
use PHPUnit\Framework\TestCase;

final class BlockContractAdapterTest extends TestCase {
	public function test_unknown_third_party_block_is_not_ai_authorable_by_default(): void {
		WP_Block_Type_Registry::get_instance()->register_test_type(
			'vendor/example',
			array(
				'content'  => array( 'type' => 'string' ),
				'dangerous'=> array( 'type' => 'string' ),
			)
		);
		$registry = new BlockContractRegistry();
		$this->assertFalse( $registry->is_ai_authorable( 'vendor/example' ) );
	}

	public function test_adapter_explicitly_opts_in_and_can_narrow_attributes(): void {
		WP_Block_Type_Registry::get_instance()->register_test_type(
			'vendor/adapter-example',
			array(
				'content'   => array( 'type' => 'string' ),
				'dangerous' => array( 'type' => 'string' ),
			)
		);
		$registry = new BlockContractRegistry();
		$this->assertTrue(
			$registry->register_adapter(
				'vendor/adapter-example',
				array(
					'aiAuthorable'      => true,
					'attributeAllowlist' => array( 'content' ),
				)
			)
		);
		$this->assertTrue( $registry->is_ai_authorable( 'vendor/adapter-example' ) );
		$contract = $registry->contract( 'vendor/adapter-example' );
		$this->assertArrayHasKey( 'content', $contract['attributes'] );
		$this->assertArrayNotHasKey( 'dangerous', $contract['attributes'] );
		$this->assertTrue( $registry->validate_attributes( 'vendor/adapter-example', array( 'content' => 'safe' ) )['valid'] );
		$this->assertFalse( $registry->validate_attributes( 'vendor/adapter-example', array( 'dangerous' => 'nope' ) )['valid'] );
	}
}
