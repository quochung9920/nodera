(function (wp) {
	'use strict';
	if (window.NoderaNativeUI) return;
	window.NoderaNativeUI = true;
	if (!wp || !wp.hooks || !wp.element || !wp.data || !wp.components || !wp.blockEditor || !wp.apiFetch) return;

	var h = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useMemo = wp.element.useMemo;
	var useState = wp.element.useState;
	var __ = wp.i18n.__;
	var data = wp.data;
	var apiFetch = wp.apiFetch;
	var be = wp.blockEditor;
	var c = wp.components;
	var InspectorControls = be.InspectorControls;
	var BlockControls = be.BlockControls;
	var PanelBody = c.PanelBody;
	var Dropdown = c.Dropdown;
	var ToolbarGroup = c.ToolbarGroup;
	var ToolbarButton = c.ToolbarButton;
	var TextareaControl = c.TextareaControl;
	var TextControl = c.TextControl;
	var SelectControl = c.SelectControl;
	var Button = c.Button;
	var Notice = c.Notice;
	var Spinner = c.Spinner;

	function flatten(blocks) {
		var out = [];
		(blocks || []).forEach(function (block) {
			out.push(block);
			out = out.concat(flatten(block.innerBlocks || []));
		});
		return out;
	}

	function strip(block) {
		return {
			name: block.name,
			attributes: block.attributes || {},
			innerBlocks: (block.innerBlocks || []).map(strip)
		};
	}

	function canonical(value) {
		if (Array.isArray(value)) return value.map(canonical);
		if (value && typeof value === 'object') {
			return Object.keys(value).sort().reduce(function (out, key) {
				out[key] = canonical(value[key]);
				return out;
			}, {});
		}
		return value;
	}

	async function fingerprint(blocks) {
		var encoded = new TextEncoder().encode(JSON.stringify(canonical((blocks || []).map(strip))));
		var hash = await crypto.subtle.digest('SHA-256', encoded);
		return Array.from(new Uint8Array(hash), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
	}

	function stableIdToClientId(blocks, stableId) {
		var found = flatten(blocks).find(function (block) {
			return block.attributes && block.attributes.noderaId === stableId;
		});
		return found ? found.clientId : undefined;
	}

	function materialize(spec) {
		return wp.blocks.createBlock(spec.name, spec.attributes || {}, (spec.innerBlocks || []).map(materialize));
	}

	function applyPatch(patch, blocks) {
		var actions = data.dispatch('core/block-editor');
		var selectors = data.select('core/block-editor');
		(patch.operations || []).forEach(function (operation) {
			var clientId = operation.stableId ? stableIdToClientId(blocks, operation.stableId) : undefined;
			if (operation.op === 'updateAttributes' && clientId) {
				actions.updateBlockAttributes(clientId, operation.attributes || {});
			} else if (operation.op === 'removeBlock' && clientId) {
				actions.removeBlocks([clientId]);
			} else if (operation.op === 'replaceBlock' && clientId && operation.block) {
				actions.replaceBlocks(clientId, materialize(operation.block));
			} else if (operation.op === 'replaceInnerBlocks' && clientId && operation.blocks) {
				actions.replaceInnerBlocks(clientId, operation.blocks.map(materialize), false);
			} else if (operation.op === 'insertBlock' && operation.block) {
				var parent = operation.parentStableId ? stableIdToClientId(blocks, operation.parentStableId) : undefined;
				actions.insertBlocks(materialize(operation.block), operation.index, parent);
			} else if (operation.op === 'moveBlock' && clientId) {
				var target = operation.toParentStableId ? stableIdToClientId(blocks, operation.toParentStableId) : '';
				var source = selectors.getBlockRootClientId(clientId) || '';
				actions.moveBlocksToPosition([clientId], source, target || '', operation.index || 0);
			}
		});
	}

	function useContext(clientId) {
		return data.useSelect(function (select) {
			var blockEditor = select('core/block-editor');
			var editor = select('core/editor');
			var blocks = blockEditor.getBlocks() || [];
			var selected = clientId ? blockEditor.getBlock(clientId) : null;
			var parentIds = clientId ? blockEditor.getBlockParents(clientId) : [];
			var ancestors = parentIds.map(function (id) { return blockEditor.getBlock(id); }).filter(Boolean);
			var rootId = clientId ? blockEditor.getBlockRootClientId(clientId) : '';
			var siblings = clientId ? (blockEditor.getBlocks(rootId) || []).filter(function (block) { return block.clientId !== clientId; }) : [];
			var settings = blockEditor.getSettings ? blockEditor.getSettings() : {};
			return {
				blocks: blocks,
				selected: selected,
				ancestors: ancestors,
				siblings: siblings,
				postId: Number(editor.getCurrentPostId()),
				postType: String(editor.getCurrentPostType ? editor.getCurrentPostType() : ''),
				postTitle: String(editor.getEditedPostAttribute ? editor.getEditedPostAttribute('title') || '' : ''),
				meta: editor.getEditedPostAttribute ? (editor.getEditedPostAttribute('meta') || {}) : {},
				design: {
					colors: settings.colors || [],
					gradients: settings.gradients || [],
					fontSizes: settings.fontSizes || [],
					spacingUnits: settings.spacingUnits || []
				}
			};
		}, [clientId]);
	}

	function QuickAi(props) {
		var context = props.context;
		var taskState = useState('');
		var task = taskState[0];
		var setTask = taskState[1];
		var loadingState = useState(false);
		var loading = loadingState[0];
		var setLoading = loadingState[1];
		var responseState = useState(null);
		var response = responseState[0];
		var setResponse = responseState[1];
		var noticeState = useState(null);
		var notice = noticeState[0];
		var setNotice = noticeState[1];
		var target = context.selected ? [context.selected] : [];
		var stableIds = useMemo(function () {
			return flatten(target).map(function (block) { return block.attributes && block.attributes.noderaId; }).filter(function (id) { return typeof id === 'string'; });
		}, [context.selected]);

		async function generate() {
			if (!task.trim() || !target.length) return;
			setLoading(true);
			setNotice(null);
			setResponse(null);
			try {
				var blockNames = Array.from(new Set(flatten(target).map(function (block) { return block.name; })));
				var contracts = await apiFetch({ path: '/nodera/v1/contracts?mode=expanded&task=' + encodeURIComponent(task) + '&blocks=' + encodeURIComponent(blockNames.join(',')) });
				var fp = await fingerprint(target);
				var aiContext = {
					schema: 'nodera-ai-context/v1',
					task: { request: task, mode: 'redesign' },
					target: { kind: 'subtree', stableIds: stableIds, fingerprint: fp },
					document: { postType: context.postType, title: context.postTitle, scopeTree: target.map(strip) },
					context: { ancestors: context.ancestors.map(strip), siblings: context.siblings.map(strip) },
					contracts: contracts,
					design: context.design,
					environment: { wordpressVersion: window.NoderaSettings && window.NoderaSettings.wordpress, noderaVersion: window.NoderaSettings && window.NoderaSettings.version },
					output: { schema: 'nodera-patch/v1' }
				};
				var generated = await apiFetch({
					path: '/nodera/v1/ai/generate',
					method: 'POST',
					data: {
						postId: context.postId,
						context: aiContext,
						currentBlocks: target.map(strip),
						editableStableIds: stableIds
					}
				});
				setResponse(generated);
				setNotice({ status: 'success', message: __('Generated and validated. Review the diff, then apply.', 'nodera') });
			} catch (error) {
				setNotice({ status: 'warning', message: error && error.message ? error.message : __('Direct AI provider is not configured. Use the Nodera top toolbar for the manual fallback.', 'nodera') });
			} finally {
				setLoading(false);
			}
		}

		async function apply() {
			if (!response || !response.patch) return;
			if (await fingerprint(target) !== response.patch.target.fingerprint) {
				setNotice({ status: 'error', message: __('The selected block changed. Generate again before applying.', 'nodera') });
				return;
			}
			applyPatch(response.patch, context.blocks);
			setNotice({ status: 'success', message: __('Applied to Gutenberg. Use native Undo or Save/Update.', 'nodera') });
		}

		return h('div', { className: 'nodera-native-ai' },
			h(TextareaControl, { label: __('What should Nodera change?', 'nodera'), value: task, rows: 3, onChange: setTask }),
			h(Button, { variant: 'primary', disabled: !task.trim() || loading, onClick: generate }, loading ? h(Fragment, null, Spinner ? h(Spinner) : null, ' ', __('Generating...', 'nodera')) : __('Generate in Gutenberg', 'nodera')),
			notice ? h(Notice, { status: notice.status, isDismissible: false }, notice.message) : null,
			response && response.diff ? h('div', { className: 'nodera-native-diff' }, h('strong', null, __('Changes', 'nodera')), h('ul', null, response.diff.slice(0, 12).map(function (item, index) { return h('li', { key: index }, String(item.type || 'change'), item.property ? ' - ' + item.property : '', item.blockName ? ' - ' + item.blockName : ''); }))) : null,
			response && response.patch ? h(Button, { variant: 'primary', onClick: apply }, __('Apply to Gutenberg', 'nodera')) : null
		);
	}

	function Responsive(props) {
		var deviceState = useState('tablet');
		var device = deviceState[0];
		var setDevice = deviceState[1];
		var responsive = props.attributes.noderaResponsive || {};
		var values = responsive[device] || {};
		function setValue(key, value) {
			var nextDevice = Object.assign({}, values);
			if (value) nextDevice[key] = value; else delete nextDevice[key];
			var next = Object.assign({}, responsive);
			next[device] = nextDevice;
			props.setAttributes({ noderaResponsive: next });
		}
		return h('div', { className: 'nodera-native-controls' },
			h('p', null, __('Desktop/base values stay in native Gutenberg controls.', 'nodera')),
			h(SelectControl, { label: __('Device override', 'nodera'), value: device, options: [{ label: __('Tablet', 'nodera'), value: 'tablet' }, { label: __('Mobile', 'nodera'), value: 'mobile' }], onChange: setDevice }),
			h(TextControl, { label: __('Padding', 'nodera'), value: values.padding || '', placeholder: '24px', onChange: function (value) { setValue('padding', value); } }),
			h(TextControl, { label: __('Gap', 'nodera'), value: values.gap || '', placeholder: '16px', onChange: function (value) { setValue('gap', value); } }),
			h(TextControl, { label: __('Font size', 'nodera'), value: values.fontSize || '', placeholder: '32px', onChange: function (value) { setValue('fontSize', value); } }),
			h(SelectControl, { label: __('Flex direction', 'nodera'), value: values.flexDirection || '', options: [{ label: __('Inherit', 'nodera'), value: '' }, { label: 'row', value: 'row' }, { label: 'column', value: 'column' }], onChange: function (value) { setValue('flexDirection', value); } })
		);
	}

	function Dynamic(props) {
		var supported = ['core/heading', 'core/paragraph'].indexOf(props.name) !== -1;
		if (!supported) return h(Notice, { status: 'info', isDismissible: false }, __('Native Block Bindings are currently exposed for Heading and Paragraph.', 'nodera'));
		var metadata = props.attributes.metadata || {};
		var bindings = metadata.bindings || {};
		var connected = Boolean(bindings.content);
		var key = window.NoderaSettings && window.NoderaSettings.dynamicMeta ? window.NoderaSettings.dynamicMeta : 'nodera_dynamic_text';
		function connect() {
			props.setAttributes({ metadata: Object.assign({}, metadata, { bindings: Object.assign({}, bindings, { content: { source: 'core/post-meta', args: { key: key } } }) }) });
		}
		function disconnect() {
			var next = Object.assign({}, bindings);
			delete next.content;
			props.setAttributes({ metadata: Object.assign({}, metadata, { bindings: next }) });
		}
		return h('div', { className: 'nodera-native-controls' },
			h('p', null, h('strong', null, __('Source', 'nodera') + ':'), ' core/post-meta - ', key),
			connected ? h(Button, { variant: 'tertiary', onClick: disconnect }, __('Disconnect', 'nodera')) : h(Button, { variant: 'primary', onClick: connect }, __('Connect content', 'nodera'))
		);
	}

	function States(props) {
		var stateState = useState('hover');
		var stateName = stateState[0];
		var setStateName = stateState[1];
		var all = props.attributes.noderaStateStyles || {};
		var values = all[stateName] || {};
		function setValue(key, value) {
			var nextValues = Object.assign({}, values);
			if (value) nextValues[key] = value; else delete nextValues[key];
			var next = Object.assign({}, all);
			next[stateName] = nextValues;
			props.setAttributes({ noderaStateStyles: next });
		}
		return h('div', { className: 'nodera-native-controls' },
			h(SelectControl, { label: __('State', 'nodera'), value: stateName, options: [{ label: 'Hover', value: 'hover' }, { label: 'Focus', value: 'focus' }, { label: 'Active', value: 'active' }], onChange: setStateName }),
			h(TextControl, { label: __('Opacity', 'nodera'), value: values.opacity || '', onChange: function (value) { setValue('opacity', value); } }),
			h(TextControl, { label: __('Border radius', 'nodera'), value: values.borderRadius || '', placeholder: '8px', onChange: function (value) { setValue('borderRadius', value); } }),
			h(TextareaControl, { label: __('Scoped Custom CSS', 'nodera'), value: String(props.attributes.noderaCustomCSS || ''), rows: 5, onChange: function (value) { props.setAttributes({ noderaCustomCSS: value }); } })
		);
	}

	function withNativeControls(BlockEdit) {
		return function NoderaNativeBlockEdit(props) {
			var context = useContext(props.clientId);
			if (!props.isSelected || !context.selected) return h(BlockEdit, props);
			return h(Fragment, null,
				h(BlockEdit, props),
				h(BlockControls, { group: 'other' },
					h(ToolbarGroup, null,
						h(Dropdown, {
							popoverProps: { placement: 'bottom-start', className: 'nodera-ai-popover' },
							renderToggle: function (toggle) { return h(ToolbarButton, { icon: 'superhero-alt', label: __('Nodera AI', 'nodera'), isPressed: toggle.isOpen, onClick: toggle.onToggle }, __('AI', 'nodera')); },
							renderContent: function () { return h('div', { className: 'nodera-toolbar-ai' }, h(QuickAi, { context: context })); }
						})
					)
				),
				h(InspectorControls, null,
					h(PanelBody, { title: __('Nodera AI', 'nodera'), initialOpen: false }, h(QuickAi, { context: context })),
					h(PanelBody, { title: __('Responsive', 'nodera'), initialOpen: false }, h(Responsive, props)),
					h(PanelBody, { title: __('Dynamic Data', 'nodera'), initialOpen: false }, h(Dynamic, props)),
					h(PanelBody, { title: __('States & Effects', 'nodera'), initialOpen: false }, h(States, props))
				)
			);
		};
	}

	wp.hooks.addFilter('editor.BlockEdit', 'nodera/gutenberg-native-runtime', withNativeControls);
})(window.wp);
