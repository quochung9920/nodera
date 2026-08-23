<?php
if ( ! defined( 'ABSPATH' ) ) { define( 'ABSPATH', __DIR__ . '/fixtures/wordpress/' ); }
require_once dirname( __DIR__ ) . '/includes/AI/TargetFingerprint.php';
require_once dirname( __DIR__ ) . '/includes/Gutenberg/StableBlockId.php';
if ( ! function_exists( 'wp_json_encode' ) ) { function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags ); } }
