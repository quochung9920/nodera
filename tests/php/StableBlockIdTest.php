<?php
use Nodera\Gutenberg\StableBlockId;
use PHPUnit\Framework\TestCase;

final class StableBlockIdTest extends TestCase {
	public function test_valid_id(): void { self::assertTrue( StableBlockId::is_valid( 'nd_abcdefghijkl' ) ); }
	public function test_client_id_is_not_a_valid_stable_id(): void { self::assertFalse( StableBlockId::is_valid( '4fc0e4cc-7c46-4e80' ) ); }
}
