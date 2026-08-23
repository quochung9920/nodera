<?php
/** @package Nodera */

use Nodera\AI\CandidateTree;
use PHPUnit\Framework\TestCase;

final class CandidateTreeTest extends TestCase {
	private function blocks(): array {
		return array(
			array(
				'name' => 'core/group',
				'attributes' => array( 'noderaId' => 'nd_aaaaaaaaaaaa' ),
				'innerBlocks' => array(
					array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_bbbbbbbbbbbb', 'content' => 'Before' ), 'innerBlocks' => array() ),
				),
			),
		);
	}

	public function test_updates_attributes_without_mutating_input_shape(): void {
		$candidate = CandidateTree::apply( $this->blocks(), array( array( 'op' => 'updateAttributes', 'stableId' => 'nd_bbbbbbbbbbbb', 'attributes' => array( 'content' => 'After' ) ) ) );
		$this->assertSame( 'After', $candidate[0]['innerBlocks'][0]['attributes']['content'] );
	}

	public function test_insert_and_remove(): void {
		$candidate = CandidateTree::apply( $this->blocks(), array( array( 'op' => 'insertBlock', 'parentStableId' => 'nd_aaaaaaaaaaaa', 'index' => 1, 'block' => array( 'name' => 'core/paragraph', 'attributes' => array( 'noderaId' => 'nd_cccccccccccc', 'content' => 'New' ), 'innerBlocks' => array() ) ) ) );
		$this->assertCount( 2, $candidate[0]['innerBlocks'] );
		$candidate = CandidateTree::apply( $candidate, array( array( 'op' => 'removeBlock', 'stableId' => 'nd_cccccccccccc' ) ) );
		$this->assertCount( 1, $candidate[0]['innerBlocks'] );
	}
}
