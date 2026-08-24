<?php
/**
 * Lightweight PHPUnit bootstrap for pure Nodera domain tests.
 *
 * @package Nodera
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/fixtures/wordpress/' );
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( mixed $value, int $flags = 0 ): string|false {
		return json_encode( $value, $flags );
	}
}
if ( ! function_exists( 'wp_check_invalid_utf8' ) ) {
	function wp_check_invalid_utf8( string $text, bool $strip = false ): string {
		unset( $strip );
		return $text;
	}
}
if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( string $hook_name, mixed $value ): mixed {
		unset( $hook_name );
		return $value;
	}
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( string $value ): string {
		return strip_tags( $value );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( string $value ): string {
		return htmlspecialchars( $value, ENT_QUOTES );
	}
}
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( mixed $value ): bool {
		return $value instanceof WP_Error;
	}
}
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public function __construct( public string $code = '', public string $message = '', public mixed $data = null ) {}
		public function get_error_code(): string { return $this->code; }
		public function get_error_message(): string { return $this->message; }
		public function get_error_data(): mixed { return $this->data; }
	}
}
if ( ! class_exists( 'WP_Block_Type_Registry' ) ) {
	class WP_Block_Type_Registry {
		private static ?self $instance = null;
		private array $types = array();
		public static function get_instance(): self { return self::$instance ??= new self(); }
		public function register_test_type( string $name, array $attributes = array(), ?array $parent = null, ?array $allowed = null, array $supports = array() ): void {
			$type                   = new stdClass();
			$type->title            = $name;
			$type->api_version      = 3;
			$type->attributes       = $attributes;
			$type->supports         = $supports;
			$type->selectors        = array();
			$type->parent           = $parent;
			$type->ancestor         = null;
			$type->allowed_blocks   = $allowed;
			$type->uses_context     = array();
			$type->provides_context = array();
			$this->types[ $name ]   = $type;
		}
		public function get_registered( string $name ): ?object { return $this->types[ $name ] ?? null; }
		public function get_all_registered(): array { return $this->types; }
	}
}

$common = array(
	'noderaId'          => array( 'type' => 'string' ),
	'noderaResponsive'  => array( 'type' => 'object' ),
	'noderaStateStyles' => array( 'type' => 'object' ),
	'noderaCustomCSS'   => array( 'type' => 'string' ),
	'style'             => array( 'type' => 'object' ),
	'anchor'            => array( 'type' => 'string' ),
);
$registry = WP_Block_Type_Registry::get_instance();
$registry->register_test_type( 'core/group', $common, null, null, array( 'spacing' => true, 'layout' => true ) );
$registry->register_test_type( 'core/paragraph', $common + array( 'content' => array( 'type' => 'string' ), 'metadata' => array( 'type' => 'object' ) ), null, null, array( 'typography' => true, 'spacing' => true ) );
$registry->register_test_type( 'core/heading', $common + array( 'content' => array( 'type' => 'string' ), 'level' => array( 'type' => 'number' ), 'metadata' => array( 'type' => 'object' ) ), null, null, array( 'typography' => true, 'spacing' => true ) );
$registry->register_test_type( 'core/button', $common + array( 'text' => array( 'type' => 'string' ), 'url' => array( 'type' => 'string' ), 'metadata' => array( 'type' => 'object' ), 'linkTarget' => array( 'type' => 'string' ), 'rel' => array( 'type' => 'string' ) ), null, null, array( 'color' => true, 'spacing' => true ) );
$registry->register_test_type( 'core/image', $common + array( 'alt' => array( 'type' => 'string' ), 'url' => array( 'type' => 'string' ), 'id' => array( 'type' => 'number' ), 'title' => array( 'type' => 'string' ), 'caption' => array( 'type' => 'string' ), 'metadata' => array( 'type' => 'object' ) ) );
$registry->register_test_type( 'core/html', $common + array( 'content' => array( 'type' => 'string' ) ) );
$registry->register_test_type( 'core/accordion', $common, null, array( 'core/accordion-item' ) );
$registry->register_test_type( 'core/accordion-item', $common, array( 'core/accordion' ), array( 'core/accordion-heading', 'core/accordion-panel' ) );
$registry->register_test_type( 'core/accordion-heading', $common + array( 'content' => array( 'type' => 'string' ) ), array( 'core/accordion-item' ) );
$registry->register_test_type( 'core/accordion-panel', $common, array( 'core/accordion-item' ) );
$registry->register_test_type( 'core/tabs', $common, null, array( 'core/tab-list', 'core/tab-panels' ) );
$registry->register_test_type( 'core/tab-list', $common, array( 'core/tabs' ), array( 'core/tab' ) );
$registry->register_test_type( 'core/tab', $common + array( 'content' => array( 'type' => 'string' ) ), array( 'core/tab-list' ) );
$registry->register_test_type( 'core/tab-panels', $common, array( 'core/tabs' ), array( 'core/tab-panel' ) );
$registry->register_test_type( 'core/tab-panel', $common, array( 'core/tab-panels' ) );

require_once dirname( __DIR__ ) . '/includes/Gutenberg/StableBlockId.php';
require_once dirname( __DIR__ ) . '/includes/Contracts/BlockContractRegistry.php';
require_once dirname( __DIR__ ) . '/includes/AI/TargetFingerprint.php';
require_once dirname( __DIR__ ) . '/includes/AI/CandidateTree.php';
require_once dirname( __DIR__ ) . '/includes/AI/DiffEngine.php';
require_once dirname( __DIR__ ) . '/includes/AI/DesignQualityGate.php';
require_once dirname( __DIR__ ) . '/includes/AI/PatchValidator.php';
require_once dirname( __DIR__ ) . '/includes/AI/ContextSanitizer.php';
require_once dirname( __DIR__ ) . '/includes/Responsive/BreakpointRegistry.php';
require_once dirname( __DIR__ ) . '/includes/Responsive/ResponsiveStyleCompiler.php';
