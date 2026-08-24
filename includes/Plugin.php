<?php
/**
 * Main plugin composition root.
 *
 * @package Nodera
 */

namespace Nodera;

use Nodera\AI\ProviderManager;
use Nodera\Bindings\DynamicBindings;
use Nodera\Blocks\BlockRegistry;
use Nodera\Contracts\BlockContractRegistry;
use Nodera\Gutenberg\StableBlockId;
use Nodera\Responsive\BreakpointRegistry;
use Nodera\Responsive\ResponsiveStyleCompiler;
use Nodera\Rest\AIRestController;
use Nodera\Rest\DiagnosticsController;

final class Plugin {
	private static ?self $instance = null;
	private bool $booted = false;

	public static function instance(): self {
		return self::$instance ??= new self();
	}

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		$stable_ids  = new StableBlockId();
		$contracts   = new BlockContractRegistry();
		$breakpoints = new BreakpointRegistry();
		$legacy_responsive = new ResponsiveStyleCompiler( $breakpoints );
		$bindings    = new DynamicBindings();
		$blocks      = new BlockRegistry();
		$providers   = new ProviderManager( $contracts );

		$stable_ids->register();
		$contracts->register();
		// Alpha.4 compatibility only. New responsive authoring uses WordPress 7.1 native style states.
		$legacy_responsive->register();
		$bindings->register();
		$blocks->register();
		$providers->register();
		( new AIRestController( $contracts ) )->register();
		( new DiagnosticsController( $contracts, $breakpoints ) )->register();

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	public function enqueue_editor(): void {
		$schema_bootstrap = <<<'JS'
(function(wp){
	if(!wp || !wp.hooks){ return; }
	wp.hooks.addFilter('blocks.registerBlockType','nodera/persistent-attributes',function(settings){
		var attributes = Object.assign({}, settings.attributes || {});
		attributes.noderaId = attributes.noderaId || { type: 'string' };
		attributes.noderaResponsive = attributes.noderaResponsive || { type: 'object' };
		attributes.noderaStateStyles = attributes.noderaStateStyles || { type: 'object' };
		attributes.noderaCustomCSS = attributes.noderaCustomCSS || { type: 'string' };
		return Object.assign({}, settings, { attributes: attributes });
	});
})(window.wp);
JS;
		wp_add_inline_script( 'wp-blocks', $schema_bootstrap, 'after' );

		$script = NODERA_DIR . 'build/editor.js';
		if ( ! file_exists( $script ) ) {
			return;
		}
		$asset_file = NODERA_DIR . 'build/editor.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array( 'dependencies' => array(), 'version' => NODERA_VERSION );
		$version    = is_array( $asset ) && isset( $asset['version'] ) ? (string) $asset['version'] : NODERA_VERSION;
		$deps       = is_array( $asset ) && isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array();

		wp_enqueue_script( 'nodera-editor', NODERA_URL . 'build/editor.js', $deps, $version, true );
		if ( file_exists( NODERA_DIR . 'build/editor.css' ) ) {
			wp_enqueue_style( 'nodera-editor', NODERA_URL . 'build/editor.css', array( 'wp-components' ), $version );
		}
		$theme = wp_get_theme();
		$providers = new ProviderManager( new BlockContractRegistry() );
		wp_add_inline_script(
			'nodera-editor',
			'window.NoderaSettings=' . wp_json_encode(
				array(
					'version'            => NODERA_VERSION,
					'wordpress'          => get_bloginfo( 'version' ),
					'restRoot'           => esc_url_raw( rest_url( 'nodera/v1/' ) ),
					'nonce'              => wp_create_nonce( 'wp_rest' ),
					'theme'              => $theme->get_stylesheet(),
					'breakpoints'        => ( new BreakpointRegistry() )->all(),
					'dynamicMeta'        => DynamicBindings::META_KEY,
					'nativeResponsive'   => true,
					'nativePseudoStates' => array( 'core/button', 'core/navigation-link' ),
					'aiProvider'         => $providers->public_status(),
					'settingsUrl'        => admin_url( 'options-general.php?page=nodera-ai' ),
				)
			) . ';',
			'before'
		);

		// Editor-only compatibility for alpha.2–alpha.4 saved content. These blocks are hidden from the inserter.
		$legacy_blocks = <<<'JS'
(function(wp){
	if(!wp || !wp.blocks || !wp.element || !wp.components || !wp.blockEditor){ return; }
	var h=wp.element.createElement, __=wp.i18n.__, c=wp.components, RichText=wp.blockEditor.RichText;
	if(!wp.blocks.getBlockType('nodera/accordion')){
		wp.blocks.registerBlockType('nodera/accordion',{
			apiVersion:3,title:__('Nodera Accordion (Legacy)','nodera'),category:'design',icon:'menu-alt3',
			attributes:{title:{type:'string',default:'Accordion title'},content:{type:'string',default:'Accordion content'}},
			supports:{html:false,inserter:false,align:['wide','full'],spacing:{margin:true,padding:true}},
			edit:function(props){return h('div',{className:'nodera-accordion-editor'},h(c.Notice,{status:'warning',isDismissible:false},__('Legacy block. Use Core Accordion for new content.','nodera')),h(c.TextControl,{label:__('Accordion title','nodera'),value:props.attributes.title||'',onChange:function(v){props.setAttributes({title:v});}}),h(RichText,{tagName:'div',value:props.attributes.content||'',onChange:function(v){props.setAttributes({content:v});}}));},
			save:function(){return null;}
		});
	}
	if(!wp.blocks.getBlockType('nodera/tabs')){
		wp.blocks.registerBlockType('nodera/tabs',{
			apiVersion:3,title:__('Nodera Tabs (Legacy)','nodera'),category:'design',icon:'index-card',
			attributes:{items:{type:'array',default:[{label:'Tab one',content:'First tab content'},{label:'Tab two',content:'Second tab content'}]}},
			supports:{html:false,inserter:false,align:['wide','full'],spacing:{margin:true,padding:true}},
			edit:function(props){var items=Array.isArray(props.attributes.items)?props.attributes.items:[];function update(i,key,v){props.setAttributes({items:items.map(function(item,n){if(n!==i)return item;var next=Object.assign({},item);next[key]=v;return next;})});}return h('div',{className:'nodera-tabs-editor'},h(c.Notice,{status:'warning',isDismissible:false},__('Legacy block. Use Core Tabs for new content.','nodera')),items.map(function(item,i){return h('div',{key:i,className:'nodera-tab-editor'},h(c.TextControl,{label:__('Tab label','nodera'),value:item.label||'',onChange:function(v){update(i,'label',v);}}),h(RichText,{tagName:'div',value:item.content||'',onChange:function(v){update(i,'content',v);}}));}));},
			save:function(){return null;}
		});
	}
})(window.wp);
JS;
		wp_add_inline_script( 'nodera-editor', $legacy_blocks, 'after' );
	}
}
