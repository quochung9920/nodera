(function (wp) {
	'use strict';
	if (!wp || !wp.element || !wp.data || !wp.blocks || !wp.components || !wp.plugins || !wp.hooks || !wp.apiFetch || !wp.blockEditor) return;
	window.NoderaNativeUI = true;

	var h = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useEffect = wp.element.useEffect;
	var useMemo = wp.element.useMemo;
	var useState = wp.element.useState;
	var __ = wp.i18n.__;
	var data = wp.data;
	var apiFetch = wp.apiFetch;
	var blocksApi = wp.blocks;
	var be = wp.blockEditor;
	var c = wp.components;
	var ID_RE = /^nd_[a-z0-9]{12,40}$/;

	function flatten(blocks) {
		var out = [];
		(blocks || []).forEach(function (block) { out.push(block); out = out.concat(flatten(block.innerBlocks || [])); });
		return out;
	}
	function strip(block) { return { name: block.name, attributes: block.attributes || {}, innerBlocks: (block.innerBlocks || []).map(strip) }; }
	function stripBlocks(blocks) { return (blocks || []).map(strip); }
	function newId() {
		var bytes = crypto.getRandomValues(new Uint8Array(12));
		return 'nd_' + Array.from(bytes, function (v) { return v.toString(36).padStart(2, '0'); }).join('').slice(0, 24);
	}
	function ensureIds(blocks) {
		var seen = new Set(); var actions = data.dispatch('core/block-editor');
		flatten(blocks).forEach(function (block) {
			if (!block.clientId) return;
			var id = block.attributes && block.attributes.noderaId;
			if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id)) actions.updateBlockAttributes(block.clientId, { noderaId: newId() });
			else seen.add(id);
		});
	}
	function canonical(value) {
		if (Array.isArray(value)) return value.map(canonical);
		if (value && typeof value === 'object') return Object.keys(value).sort().reduce(function (o, k) { o[k] = canonical(value[k]); return o; }, {});
		return value;
	}
	async function fingerprint(blocks) {
		var bytes = new TextEncoder().encode(JSON.stringify(canonical(stripBlocks(blocks))));
		var hash = await crypto.subtle.digest('SHA-256', bytes);
		return Array.from(new Uint8Array(hash), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
	}
	function idToClient(blocks, stableId) {
		var found = flatten(blocks).find(function (block) { return block.attributes && block.attributes.noderaId === stableId; });
		return found && found.clientId;
	}
	function materialize(spec) { return blocksApi.createBlock(spec.name, spec.attributes || {}, (spec.innerBlocks || []).map(materialize)); }
	function applyPatch(patch, blocks) {
		var actions = data.dispatch('core/block-editor'); var selectors = data.select('core/block-editor');
		(patch.operations || []).forEach(function (op) {
			var id = op.stableId ? idToClient(blocks, op.stableId) : undefined;
			if (op.op === 'updateAttributes' && id) actions.updateBlockAttributes(id, op.attributes || {});
			else if (op.op === 'removeBlock' && id) actions.removeBlocks([id]);
			else if (op.op === 'replaceBlock' && id && op.block) actions.replaceBlocks(id, materialize(op.block));
			else if (op.op === 'replaceInnerBlocks' && id && op.blocks) actions.replaceInnerBlocks(id, op.blocks.map(materialize), false);
			else if (op.op === 'insertBlock' && op.block) actions.insertBlocks(materialize(op.block), op.index, op.parentStableId ? idToClient(blocks, op.parentStableId) : undefined);
			else if (op.op === 'moveBlock' && id) actions.moveBlocksToPosition([id], selectors.getBlockRootClientId(id) || '', op.toParentStableId ? idToClient(blocks, op.toParentStableId) : '', op.index || 0);
		});
	}
	function capture(target) {
		var nodes = {};
		flatten(target).forEach(function (block) {
			if (!block.clientId || !block.attributes || !block.attributes.noderaId) return;
			var el = document.querySelector('[data-block="' + block.clientId.replace(/[^a-zA-Z0-9_-]/g, '') + '"]');
			if (!el) return;
			var r = el.getBoundingClientRect(); var s = getComputedStyle(el);
			nodes[block.attributes.noderaId] = { rect: { x:r.x,y:r.y,width:r.width,height:r.height }, color:s.color, backgroundColor:s.backgroundColor, fontSize:s.fontSize, lineHeight:s.lineHeight, display:s.display, horizontalOverflow:el.scrollWidth > el.clientWidth + 1 };
		});
		return { browser: { measuredGeometry:Object.keys(nodes).length>0, captureStatus:Object.keys(nodes).length?'ok':'unavailable', viewport:{width:window.innerWidth,height:window.innerHeight,devicePixelRatio:window.devicePixelRatio}, nodes:nodes } };
	}
	function useContext(clientId) {
		return data.useSelect(function (select) {
			var editor = select('core/editor'); var blockEditor = select('core/block-editor');
			var blocks = blockEditor.getBlocks() || []; var selected = clientId ? blockEditor.getBlock(clientId) : null;
			var parents = clientId ? blockEditor.getBlockParents(clientId) : []; var root = clientId ? blockEditor.getBlockRootClientId(clientId) : '';
			var settings = blockEditor.getSettings ? blockEditor.getSettings() : {};
			return {
				blocks:blocks, selected:selected,
				ancestors:parents.map(function(id){return blockEditor.getBlock(id);}).filter(Boolean),
				siblings:clientId ? (blockEditor.getBlocks(root)||[]).filter(function(b){return b.clientId!==clientId;}) : [],
				postId:Number(editor.getCurrentPostId()), postType:String(editor.getCurrentPostType ? editor.getCurrentPostType() : ''), postTitle:String(editor.getEditedPostAttribute ? editor.getEditedPostAttribute('title')||'' : ''),
				meta:editor.getEditedPostAttribute ? (editor.getEditedPostAttribute('meta')||{}) : {},
				design:{colors:settings.colors||[],gradients:settings.gradients||[],fontSizes:settings.fontSizes||[],spacingUnits:settings.spacingUnits||[]}
			};
		}, [clientId]);
	}
	function freshTarget(context, pageMode) {
		var store = data.select('core/block-editor');
		if (pageMode) return store.getBlocks() || [];
		return context.selected && context.selected.clientId ? [store.getBlock(context.selected.clientId)].filter(Boolean) : [];
	}
	function QuickAi(props) {
		var context = props.context; var pageMode = !!props.pageMode;
		var st = useState(''); var task = st[0], setTask = st[1];
		var ls = useState(false); var loading = ls[0], setLoading = ls[1];
		var rs = useState(null); var response = rs[0], setResponse = rs[1];
		var ns = useState(null); var notice = ns[0], setNotice = ns[1];
		var provider = window.NoderaSettings && window.NoderaSettings.aiProvider;
		async function generate() {
			if (!task.trim()) return; setLoading(true); setNotice(null); setResponse(null);
			try {
				var initial = pageMode ? context.blocks : (context.selected ? [context.selected] : []); ensureIds(initial);
				await new Promise(function(resolve){requestAnimationFrame(resolve);});
				var target = freshTarget(context, pageMode); var all = data.select('core/block-editor').getBlocks() || context.blocks;
				var stableIds = flatten(target).map(function(b){return b.attributes && b.attributes.noderaId;}).filter(function(id){return typeof id==='string';});
				var names = Array.from(new Set(flatten(target).map(function(b){return b.name;})));
				var contracts = await apiFetch({path:'/nodera/v1/contracts?mode=expanded&task='+encodeURIComponent(task)+'&blocks='+encodeURIComponent(names.join(','))});
				var fp = await fingerprint(target);
				var aiContext = { schema:'nodera-ai-context/v1', task:{request:task,mode:pageMode?'create':'redesign'}, target:{kind:pageMode?'page':'subtree',stableIds:stableIds,fingerprint:fp}, document:{postType:context.postType,title:context.postTitle,scopeTree:stripBlocks(target)}, context:{ancestors:stripBlocks(context.ancestors),siblings:stripBlocks(context.siblings)}, contracts:contracts, design:context.design, visualFacts:capture(target), nativeWordPress:{responsiveStyleStates:['@tablet','@mobile'],pseudoStyleStates:{'core/button':[':hover',':focus',':focus-visible',':active'],'core/navigation-link':[':hover',':focus',':focus-visible',':active']},preferredDesignBlocks:['core/accordion','core/tabs']}, environment:{wordpressVersion:window.NoderaSettings.wordpress,noderaVersion:window.NoderaSettings.version}, limits:{maxOperations:200,maxPayloadBytes:524288}, output:{schema:'nodera-patch/v1'} };
				var generated = await apiFetch({path:'/nodera/v1/ai/generate',method:'POST',data:{postId:context.postId,context:aiContext,currentBlocks:stripBlocks(target),editableStableIds:stableIds,visualFacts:aiContext.visualFacts}});
				setResponse(generated); setNotice({status:'success',message:__('Generated and validated. Review the changes, then Apply.', 'nodera')});
			} catch(error) { setNotice({status:'warning',message:error && error.message ? error.message : __('AI generation failed.', 'nodera')}); }
			finally { setLoading(false); }
		}
		async function apply() {
			if (!response || !response.patch) return; var target=freshTarget(context,pageMode);
			if (await fingerprint(target)!==response.patch.target.fingerprint) { setNotice({status:'error',message:__('Target changed. Generate again.', 'nodera')}); return; }
			applyPatch(response.patch, data.select('core/block-editor').getBlocks()||context.blocks); setNotice({status:'success',message:__('Applied to Gutenberg. Use native Undo or Save/Update.', 'nodera')});
		}
		return h('div',{className:'nodera-native-ai'},
			provider && provider.configured ? h(c.Notice,{status:'success',isDismissible:false},__('Direct AI', 'nodera')+': '+provider.provider+(provider.model?' · '+provider.model:'')) : h(c.Notice,{status:'warning',isDismissible:false},__('Direct AI is not configured. ', 'nodera'), window.NoderaSettings.settingsUrl ? h('a',{href:window.NoderaSettings.settingsUrl},__('Configure provider','nodera')):null),
			h(c.TextareaControl,{label:__('What should Nodera change?','nodera'),value:task,rows:3,onChange:setTask}),
			h(c.Button,{variant:'primary',disabled:!task.trim()||loading||!(provider&&provider.configured),onClick:generate},loading ? h(Fragment,null,c.Spinner?h(c.Spinner):null,' ',__('Generating…','nodera')) : __('Generate in Gutenberg','nodera')),
			notice?h(c.Notice,{status:notice.status,isDismissible:false},notice.message):null,
			response&&response.diff?h('ul',{className:'nodera-diff'},response.diff.slice(0,16).map(function(item,i){return h('li',{key:i},String(item.type||'change'),item.blockName?' · '+item.blockName:'',item.property?' · '+item.property:'');})):null,
			response&&response.quality&&response.quality.length?h('ul',null,response.quality.slice(0,10).map(function(item,i){return h('li',{key:i},String(item.severity||'info')+': '+String(item.message||''));})):null,
			response&&response.patch?h(c.Button,{variant:'primary',onClick:apply},__('Apply to Gutenberg','nodera')):null
		);
	}
	function nativeResponsive(props) {
		var ds=useState('tablet'); var device=ds[0],setDevice=ds[1]; var style=props.attributes.style||{}; var key=device==='tablet'?'@tablet':'@mobile'; var state=style[key]||{};
		function patch(group,value){var next=Object.assign({},state);next[group]=Object.assign({},state[group]||{},value);var all=Object.assign({},style);all[key]=next;props.setAttributes({style:all});}
		function edges(v){return v?{top:v,right:v,bottom:v,left:v}:undefined;}
		function reset(){var all=Object.assign({},style);delete all[key];props.setAttributes({style:all});}
		return h('div',{className:'nodera-native-controls'},h(c.Notice,{status:'info',isDismissible:false},__('Uses native WordPress 7.1 style viewport states.','nodera')),h(c.SelectControl,{label:__('Viewport','nodera'),value:device,options:[{label:'Tablet',value:'tablet'},{label:'Mobile',value:'mobile'}],onChange:setDevice}),h(c.TextControl,{label:__('Padding (all sides)','nodera'),value:state.spacing&&state.spacing.padding?state.spacing.padding.top||'':'',placeholder:'24px',onChange:function(v){patch('spacing',{padding:edges(v)});}}),h(c.TextControl,{label:__('Block gap','nodera'),value:state.spacing&&typeof state.spacing.blockGap==='string'?state.spacing.blockGap:'',placeholder:'16px',onChange:function(v){patch('spacing',{blockGap:v||undefined});}}),h(c.TextControl,{label:__('Font size','nodera'),value:state.typography?state.typography.fontSize||'':'',placeholder:'32px',onChange:function(v){patch('typography',{fontSize:v||undefined});}}),h(c.TextControl,{label:__('Text color','nodera'),value:state.color?state.color.text||'':'',onChange:function(v){patch('color',{text:v||undefined});}}),h(c.TextControl,{label:__('Background color','nodera'),value:state.color?state.color.background||'':'',onChange:function(v){patch('color',{background:v||undefined});}}),h(c.Button,{variant:'tertiary',onClick:reset},__('Reset viewport','nodera')));
	}
	function nativeStates(props) {
		var allowed=['core/button','core/navigation-link'].indexOf(props.name)!==-1;
		if(!allowed)return h(c.Notice,{status:'info',isDismissible:false},__('WordPress 7.1 currently exposes block-instance pseudo states for Button and Navigation Link.','nodera'));
		var ss=useState(':hover');var stateName=ss[0],setStateName=ss[1];var style=props.attributes.style||{};var state=style[stateName]||{};
		function patch(group,value){var next=Object.assign({},state);next[group]=Object.assign({},state[group]||{},value);var all=Object.assign({},style);all[stateName]=next;props.setAttributes({style:all});}
		return h('div',{className:'nodera-native-controls'},h(c.SelectControl,{label:__('State','nodera'),value:stateName,options:[{label:'Hover',value:':hover'},{label:'Focus',value:':focus'},{label:'Focus visible',value:':focus-visible'},{label:'Active',value:':active'}],onChange:setStateName}),h(c.TextControl,{label:__('Text color','nodera'),value:state.color?state.color.text||'':'',onChange:function(v){patch('color',{text:v||undefined});}}),h(c.TextControl,{label:__('Background color','nodera'),value:state.color?state.color.background||'':'',onChange:function(v){patch('color',{background:v||undefined});}}),h(c.TextareaControl,{label:__('Scoped Custom CSS fallback','nodera'),value:String(props.attributes.noderaCustomCSS||''),rows:5,onChange:function(v){props.setAttributes({noderaCustomCSS:v});}}));
	}
	function Dynamic(props) {
		if(['core/heading','core/paragraph'].indexOf(props.name)===-1)return h(c.Notice,{status:'info',isDismissible:false},__('Current safe binding UI supports Heading and Paragraph.','nodera'));
		var metadata=props.attributes.metadata||{},bindings=metadata.bindings||{},key=window.NoderaSettings.dynamicMeta,connected=Boolean(bindings.content);
		function connect(){props.setAttributes({metadata:Object.assign({},metadata,{bindings:Object.assign({},bindings,{content:{source:'core/post-meta',args:{key:key}}})})});}
		function disconnect(){var next=Object.assign({},bindings);delete next.content;props.setAttributes({metadata:Object.assign({},metadata,{bindings:next})});}
		return h('div',{className:'nodera-native-controls'},h('p',null,'core/post-meta · ',key),connected?h(c.Button,{variant:'tertiary',onClick:disconnect},__('Disconnect','nodera')):h(c.Button,{variant:'primary',onClick:connect},__('Connect content','nodera')));
	}
	function withControls(BlockEdit) {
		return function(props){
			if(!props.isSelected)return h(BlockEdit,props);
			var context=useContext(props.clientId);
			if(!context.selected)return h(BlockEdit,props);
			useEffect(function(){ensureIds([context.selected]);},[context.selected.clientId]);
			return h(Fragment,null,h(BlockEdit,props),h(be.BlockControls,{group:'other'},h(c.ToolbarGroup,null,h(c.Dropdown,{popoverProps:{placement:'bottom-start',className:'nodera-ai-popover'},renderToggle:function(t){return h(c.ToolbarButton,{icon:'superhero-alt',label:__('Nodera AI','nodera'),isPressed:t.isOpen,onClick:t.onToggle},__('AI','nodera'));},renderContent:function(){return h('div',{className:'nodera-toolbar-ai'},h(QuickAi,{context:context}));}}))),h(be.InspectorControls,null,h(c.PanelBody,{title:__('✦ Nodera AI','nodera'),initialOpen:false},h(QuickAi,{context:context})),h(c.PanelBody,{title:__('Responsive','nodera'),initialOpen:false},h(nativeResponsive,props)),h(c.PanelBody,{title:__('Dynamic Data','nodera'),initialOpen:false},h(Dynamic,props)),h(c.PanelBody,{title:__('States & Effects','nodera'),initialOpen:false},h(nativeStates,props))));
		};
	}
	wp.hooks.addFilter('editor.BlockEdit','nodera/gutenberg-native-controls',withControls);

	var editorPkg=wp.editor||wp.editPost||{}; var PluginSidebar=editorPkg.PluginSidebar; var PluginSidebarMoreMenuItem=editorPkg.PluginSidebarMoreMenuItem;
	function PageTools(){var context=useContext();return h(Fragment,null,PluginSidebarMoreMenuItem?h(PluginSidebarMoreMenuItem,{target:'nodera-page-tools'},__('Nodera','nodera')):null,PluginSidebar?h(PluginSidebar,{name:'nodera-page-tools',title:__('Nodera','nodera'),icon:'superhero-alt'},h(c.PanelBody,{title:__('Build Page with AI','nodera'),initialOpen:true},h(QuickAi,{context:context,pageMode:true})),h(c.PanelBody,{title:__('Gutenberg-native architecture','nodera'),initialOpen:false},h(c.Notice,{status:'info',isDismissible:false},__('post_content, List View, Undo/Redo, Save, revisions, rendering, responsive style states and supported pseudo states remain owned by WordPress.','nodera')))):null);}
	wp.plugins.registerPlugin('nodera',{render:PageTools});
})(window.wp);
