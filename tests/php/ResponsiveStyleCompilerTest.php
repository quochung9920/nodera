<?php
/** @package Nodera */

use Nodera\Responsive\BreakpointRegistry;
use Nodera\Responsive\ResponsiveStyleCompiler;
use PHPUnit\Framework\TestCase;

final class ResponsiveStyleCompilerTest extends TestCase {
	public function test_compiles_bounded_responsive_declarations(): void {
		$compiler = new ResponsiveStyleCompiler( new BreakpointRegistry() );
		$blocks = array( array( 'attrs' => array( 'noderaId' => 'nd_aaaaaaaaaaaa', 'noderaResponsive' => array( 'mobile' => array( 'padding' => '16px 20px', 'paddingTop' => '16px', 'flexDirection' => 'column' ) ) ), 'innerBlocks' => array() ) );
		$css = $compiler->compile( $blocks );
		$this->assertStringContainsString( '@media (max-width:767px)', $css );
		$this->assertStringContainsString( 'padding:16px 20px;', $css );
		$this->assertStringContainsString( 'padding-top:16px;', $css );
		$this->assertStringContainsString( 'flex-direction:column;', $css );
	}

	public function test_rejects_remote_custom_css(): void {
		$compiler = new ResponsiveStyleCompiler( new BreakpointRegistry() );
		$this->assertSame( '', $compiler->compile_custom_css( '[data-nodera-id="nd_aaaaaaaaaaaa"]', '&{background:url(https://example.com/a.png)}' ) );
	}
}
