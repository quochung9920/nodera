<?php
/**
 * Legacy frontend responsive/state/scoped CSS compatibility compiler.
 *
 * @package Nodera
 */

namespace Nodera\Responsive;

use Nodera\Gutenberg\StableBlockId;

/**
 * Compiles alpha.4 Nodera overrides into stable-ID scoped CSS.
 * New WordPress 7.1+ authoring uses native Gutenberg style states instead.
 */
final class ResponsiveStyleCompiler {
	public const RESPONSIVE_ATTRIBUTE = 'noderaResponsive';
	public const STATE_ATTRIBUTE      = 'noderaStateStyles';
	public const CSS_ATTRIBUTE        = 'noderaCustomCSS';

	private const PROPERTIES = array(
		'padding'        => 'padding',
		'paddingTop'     => 'padding-top',
		'paddingRight'   => 'padding-right',
		'paddingBottom'  => 'padding-bottom',
		'paddingLeft'    => 'padding-left',
		'marginTop'      => 'margin-top',
		'marginRight'    => 'margin-right',
		'marginBottom'   => 'margin-bottom',
		'marginLeft'     => 'margin-left',
		'gap'            => 'gap',
		'width'          => 'width',
		'minWidth'       => 'min-width',
		'maxWidth'       => 'max-width',
		'fontSize'       => 'font-size',
		'lineHeight'     => 'line-height',
		'flexDirection'  => 'flex-direction',
		'flexWrap'       => 'flex-wrap',
		'justifyContent' => 'justify-content',
		'alignItems'     => 'align-items',
		'display'        => 'display',
		'borderRadius'   => 'border-radius',
		'opacity'        => 'opacity',
	);

	public function __construct( private BreakpointRegistry $breakpoints ) {}

	public function register(): void {
		add_filter( 'register_block_type_args', array( $this, 'register_attributes' ), 11, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_styles' ), 30 );
	}

	public function register_attributes( array $args, string $name ): array {
		unset( $name );
		$args['attributes'] ??= array();
		$args['attributes'][ self::RESPONSIVE_ATTRIBUTE ] ??= array( 'type' => 'object' );
		$args['attributes'][ self::STATE_ATTRIBUTE ] ??= array( 'type' => 'object' );
		$args['attributes'][ self::CSS_ATTRIBUTE ] ??= array( 'type' => 'string' );
		return $args;
	}

	public function enqueue_frontend_styles(): void {
		if ( ! is_singular() ) {
			return;
		}
		$post = get_queried_object();
		if ( ! $post instanceof \WP_Post ) {
			return;
		}
		$css = $this->compile( parse_blocks( $post->post_content ) );
		if ( '' === $css ) {
			return;
		}
		wp_register_style( 'nodera-runtime', false, array(), NODERA_VERSION );
		wp_enqueue_style( 'nodera-runtime' );
		wp_add_inline_style( 'nodera-runtime', $css );
	}

	public function compile( array $blocks ): string {
		$media  = array();
		$states = array();
		$custom = array();
		$this->collect( $blocks, $media, $states, $custom );
		$css = implode( '', $states ) . implode( '', $custom );
		foreach ( $this->breakpoints->all() as $key => $config ) {
			if ( empty( $media[ $key ] ) ) {
				continue;
			}
			$css .= '@media (max-width:' . (int) $config['maxWidth'] . 'px){' . implode( '', $media[ $key ] ) . '}';
		}
		return $css;
	}

	private function collect( array $blocks, array &$media, array &$states, array &$custom ): void {
		foreach ( $blocks as $block ) {
			$attrs = (array) ( $block['attrs'] ?? $block['attributes'] ?? array() );
			$id    = $attrs[ StableBlockId::ATTRIBUTE ] ?? '';
			if ( StableBlockId::is_valid( $id ) ) {
				$selector   = '[data-nodera-id="' . esc_attr( $id ) . '"]';
				$responsive = (array) ( $attrs[ self::RESPONSIVE_ATTRIBUTE ] ?? array() );
				foreach ( $this->breakpoints->all() as $key => $config ) {
					unset( $config );
					$declarations = $this->declarations( (array) ( $responsive[ $key ] ?? array() ) );
					if ( '' !== $declarations ) {
						$media[ $key ][] = $selector . '{' . $declarations . '}';
					}
				}
				foreach ( array( 'hover', 'focus', 'focus-visible', 'active' ) as $state ) {
					$declarations = $this->declarations( (array) ( $attrs[ self::STATE_ATTRIBUTE ][ $state ] ?? array() ) );
					if ( '' !== $declarations ) {
						$states[] = $selector . ':' . $state . '{' . $declarations . '}';
					}
				}
				$scoped = $this->compile_custom_css( $selector, (string) ( $attrs[ self::CSS_ATTRIBUTE ] ?? '' ) );
				if ( '' !== $scoped ) {
					$custom[] = $scoped;
				}
			}
			$this->collect( (array) ( $block['innerBlocks'] ?? array() ), $media, $states, $custom );
		}
	}

	public function declarations( array $properties ): string {
		$out = array();
		foreach ( $properties as $key => $value ) {
			if ( ! isset( self::PROPERTIES[ $key ] ) || ! is_scalar( $value ) ) {
				continue;
			}
			$value = trim( (string) $value );
			if ( '' === $value || strlen( $value ) > 80 || preg_match( '/[{};<>]/', $value ) ) {
				continue;
			}
			$out[] = self::PROPERTIES[ $key ] . ':' . $value . ';';
		}
		return implode( '', $out );
	}

	public function compile_custom_css( string $selector, string $css ): string {
		$css = trim( $css );
		if ( '' === $css || strlen( $css ) > 8000 || false !== stripos( $css, '@import' ) || false !== stripos( $css, 'url(' ) ) {
			return '';
		}
		$pattern = '/(&(?::(?:hover|focus|focus-visible|active))?)\s*\{([^{}]*)\}/';
		if ( preg_match_all( $pattern, $css, $matches, PREG_SET_ORDER ) < 1 ) {
			return '';
		}
		if ( '' !== trim( (string) preg_replace( $pattern, '', $css ) ) ) {
			return '';
		}
		$compiled = '';
		foreach ( $matches as $match ) {
			$declarations = trim( $match[2] );
			if ( '' === $declarations || preg_match( '/[<>@]/', $declarations ) || preg_match( '/(?:javascript\s*:|expression\s*\()/i', $declarations ) ) {
				continue;
			}
			$compiled .= str_replace( '&', $selector, $match[1] ) . '{' . $declarations . '}';
		}
		return $compiled;
	}
}
