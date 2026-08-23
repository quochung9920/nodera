(function (wp) {
	'use strict';
	if (!wp || !wp.element || !wp.data || !wp.blocks || !wp.components || !wp.plugins || !wp.i18n || !wp.apiFetch) {
		return;
	}

	var h = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useEffect = wp.element.useEffect;
	var useMemo = wp.element.useMemo;
	var useState = wp.element.useState;
	var __ = wp.i18n.__;
	var apiFetch = wp.apiFetch;
	var data = wp.data;
	var blocksApi = wp.blocks;
	var components = wp.components;
	var blockEditor = wp.blockEditor || {};
	var editorPkg = wp.editor || wp.editPost || {};
	var PluginSidebar = editorPkg.PluginSidebar;
	var PluginSidebarMoreMenuItem = editorPkg.PluginSidebarMoreMenuItem;
	var PanelBody = components.PanelBody;
	var TabPanel = components.TabPanel;
	var Button = components.Button;
	var Notice = components.Notice;
	var SelectControl = components.SelectControl;
	var TextareaControl = components.TextareaControl;
	var TextControl = components.TextControl;
	var RichText = blockEditor.RichText;
	var BlockPreview = blockEditor.BlockPreview;
	var ID_RE = /^nd_[a-z0-9]{12,40}$/;

	function newStableId() {
		var bytes = crypto.getRandomValues(new Uint8Array(12));
		var token = Array.from(bytes, function (value) { return value.toString(36).padStart(2, '0'); }).join('').slice(0, 24);
		return 'nd_' + token;
	}

	function flattenBlocks(blocks) {
		var output = [];
		(blocks || []).forEach(function (block) {
			output.push(block);
			output = output.concat(flattenBlocks(block.innerBlocks || []));
		});
		return output;
	}

	function stableIdToClientId(blocks, stableId) {
		var found = flattenBlocks(blocks).find(function (block) { return block.attributes && block.attributes.noderaId === stableId; });
		return found ? found.clientId : undefined;
	}

	function stripBlock(block) {
		return {
			name: block.name,
			attributes: block.attributes || {},
			innerBlocks: (block.innerBlocks || []).map(stripBlock)
		};
	}

	function stripBlocks(blocks) {
		return (blocks || []).map(stripBlock);
	}

	function canonicalize(value) {
		if (Array.isArray(value)) return value.map(canonicalize);
		if (value && typeof value === 'object') {
			return Object.keys(value).sort().reduce(function (output, key) {
				output[key] = canonicalize(value[key]);
				return output;
			}, {});
		}
		return value;
	}

	async function fingerprint(blocks) {
		var encoded = new TextEncoder().encode(JSON.stringify(canonicalize(stripBlocks(blocks))));
		var hash = await crypto.subtle.digest('SHA-256', encoded);
		return Array.from(new Uint8Array(hash), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
	}

	var lastIdentitySignature = '';
	var reconciling = false;
	function reconcileIdentities() {
		if (reconciling) return;
		var store = data.select('core/block-editor');
		if (!store || !store.getBlocks) return;
		var all = flattenBlocks(store.getBlocks() || []);
		var signature = all.map(function (block) { return block.clientId + ':' + String((block.attributes || {}).noderaId || ''); }).join('|');
		if (signature === lastIdentitySignature) return;
		lastIdentitySignature = signature;
		var seen = new Set();
		var actions = data.dispatch('core/block-editor');
		reconciling = true;
		try {
			all.forEach(function (block) {
				var id = block.attributes && block.attributes.noderaId;
				if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id)) {
					actions.updateBlockAttributes(block.clientId, { noderaId: newStableId() });
				} else {
					seen.add(id);
				}
			});
		} finally {
			reconciling = false;
		}
	}

	function startIdentityReconciler() {
		reconcileIdentities();
		return data.subscribe(reconcileIdentities);
	}

	function sameOriginDocuments() {
		var output = [document];
		document.querySelectorAll('iframe').forEach(function (iframe) {
			try {
				if (iframe.contentDocument) output.push(iframe.contentDocument);
			} catch (e) {}
		});
		return output;
	}

	function editorElement(clientId) {
		var escaped = window.CSS && CSS.escape ? CSS.escape(clientId) : clientId.replace(/[^a-zA-Z0-9_-]/g, '');
		var docs = sameOriginDocuments();
		for (var i = 0; i < docs.length; i += 1) {
			var el = docs[i].querySelector('[data-block="' + escaped + '"]');
			if (el) return el;
		}
		return null;
	}

	function captureVisualFacts(blocks) {
		var nodes = {};
		flattenBlocks(blocks).forEach(function (block) {
			var stableId = block.attributes && block.attributes.noderaId;
			if (!block.clientId || typeof stableId !== 'string') return;
			var element = editorElement(block.clientId);
			if (!element) return;
			var rect = element.getBoundingClientRect();
			var view = element.ownerDocument.defaultView || window;
			var style = view.getComputedStyle(element);
			nodes[stableId] = {
				rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
				display: style.display,
				position: style.position,
				visibility: style.visibility,
				opacity: style.opacity,
				overflowX: style.overflowX,
				overflowY: style.overflowY,
				color: style.color,
				backgroundColor: style.backgroundColor,
				fontFamily: style.fontFamily,
				fontSize: style.fontSize,
				fontWeight: style.fontWeight,
				lineHeight: style.lineHeight,
				letterSpacing: style.letterSpacing,
				textAlign: style.textAlign,
				padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
				margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft],
				borderRadius: style.borderRadius,
				gap: style.gap,
				flexDirection: style.flexDirection,
				flexWrap: style.flexWrap,
				justifyContent: style.justifyContent,
				alignItems: style.alignItems,
				gridTemplateColumns: style.gridTemplateColumns,
				scrollWidth: element.scrollWidth,
				clientWidth: element.clientWidth,
				horizontalOverflow: element.scrollWidth > element.clientWidth + 1
			};
		});
		return {
			measuredGeometry: Object.keys(nodes).length > 0,
			captureStatus: Object.keys(nodes).length > 0 ? 'ok' : 'unavailable',
			viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
			nodes: nodes
		};
	}

	function normalizeAiResult(input) {
		var clean = String(input || '').replace(/^\uFEFF/, '').trim();
		var fenced = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
		if (fenced) clean = fenced[1].trim();
		try {
			return JSON.parse(clean);
		} catch (firstError) {
			var first = clean.indexOf('{');
			var last = clean.lastIndexOf('}');
			if (first >= 0 && last > first) {
				var candidate = clean.slice(first, last + 1);
				var before = clean.slice(0, first).trim();
				var after = clean.slice(last + 1).trim();
				if ((before.match(/{/g) || []).length === 0 && (after.match(/{/g) || []).length === 0) {
					return JSON.parse(candidate);
				}
			}
			throw firstError;
		}
	}

	function materialize(spec) {
		var attrs = Object.assign({}, spec.attributes || {});
		if (!attrs.noderaId) attrs.noderaId = newStableId();
		return blocksApi.createBlock(spec.name, attrs, (spec.innerBlocks || []).map(materialize));
	}

	function applyPatch(patch, blocks) {
		var actions = data.dispatch('core/block-editor');
		var selectors = data.select('core/block-editor');
		(patch.operations || []).forEach(function (operation) {
			var id = operation.stableId ? stableIdToClientId(blocks, operation.stableId) : undefined;
			if (operation.op === 'updateAttributes' && id) {
				actions.updateBlockAttributes(id, operation.attributes || {});
			} else if (operation.op === 'removeBlock' && id) {
				actions.removeBlocks([id]);
			} else if (operation.op === 'replaceBlock' && id && operation.block) {
				actions.replaceBlocks(id, materialize(operation.block));
			} else if (operation.op === 'replaceInnerBlocks' && id && operation.blocks) {
				actions.replaceInnerBlocks(id, operation.blocks.map(materialize), false);
			} else if (operation.op === 'insertBlock' && operation.block) {
				var parent = operation.parentStableId ? stableIdToClientId(blocks, operation.parentStableId) : undefined;
				actions.insertBlocks(materialize(operation.block), operation.index, parent);
			} else if (operation.op === 'moveBlock' && id) {
				var target = operation.toParentStableId ? stableIdToClientId(blocks, operation.toParentStableId) : '';
				var source = selectors.getBlockRootClientId(id) || '';
				actions.moveBlocksToPosition([id], source, target || '', operation.index || 0);
			}
		});
	}

	async function buildAiContext(args) {
		var stableIds = flattenBlocks(args.target).map(function (block) { return block.attributes && block.attributes.noderaId; }).filter(function (value) { return typeof value === 'string'; });
		var blockNames = flattenBlocks(args.target).map(function (block) { return block.name; });
		var query = new URLSearchParams({ mode: args.contractMode, task: args.task, blocks: Array.from(new Set(blockNames)).join(',') });
		var contracts = await apiFetch({ path: '/nodera/v1/contracts?' + query.toString() });
		var targetFingerprint = await fingerprint(args.target);
		return {
			schema: 'nodera-ai-context/v1',
			task: { request: args.task, mode: args.mode },
			target: { kind: args.target.length === 1 ? 'subtree' : 'page', stableIds: stableIds, fingerprint: targetFingerprint },
			document: { postType: args.postType, title: args.postTitle, scopeTree: stripBlocks(args.target) },
			context: { ancestors: stripBlocks(args.ancestors), siblings: stripBlocks(args.siblings) },
			contracts: contracts,
			design: args.design,
			visualFacts: { browser: captureVisualFacts(args.target) },
			environment: { wordpressVersion: window.NoderaSettings && window.NoderaSettings.wordpress, noderaVersion: window.NoderaSettings && window.NoderaSettings.version },
			limits: { maxOperations: 200, maxPayloadBytes: 524288 },
			output: { schema: 'nodera-patch/v1' }
		};
	}

	function oneShotPrompt(context) {
		return [
			'You are editing a native WordPress Gutenberg document through Nodera.',
			'Use only full block contracts included in the context. catalogIndex is discovery only.',
			'Do not invent attributes. Do not edit outside the editable target.',
			'Return ONLY one nodera-patch/v1 JSON object. No Markdown, HTML, Gutenberg comment markup, or explanation.',
			'Every newly authored block must include a unique valid noderaId.',
			'Prefer native Gutenberg blocks and structured controls over Custom CSS.',
			'If the user supplied a reference image in this AI conversation, use it as visual guidance while respecting Nodera contracts.',
			'', JSON.stringify(context, null, 2)
		].join('\n');
	}

	function printable(value) {
		if (value === null || value === undefined) return '—';
		return typeof value === 'string' ? value : JSON.stringify(value);
	}

	function Review(props) {
		var response = props.response;
		var preview = null;
		if (BlockPreview) {
			try {
				preview = h(BlockPreview, { blocks: (response.candidate || []).map(materialize), viewportWidth: 960 });
			} catch (e) {
				preview = h(Notice, { status: 'warning', isDismissible: false }, __('Candidate preview could not be rendered in this editor context.', 'nodera'));
			}
		} else {
			preview = h(Notice, { status: 'warning', isDismissible: false }, __('BlockPreview is unavailable in this WordPress editor context.', 'nodera'));
		}
		return h('div', { className: 'nodera-review' },
			h(Notice, { status: 'success', isDismissible: false }, __('Patch validated against the current target.', 'nodera')),
			h('h3', null, __('Semantic diff', 'nodera')),
			(response.diff || []).length === 0 ? h('p', null, __('No structural changes.', 'nodera')) : h('ul', { className: 'nodera-diff' }, (response.diff || []).map(function (item, index) {
				return h('li', { key: index }, h('strong', null, printable(item.type)), ' ', printable(item.blockName || item.stableId), item.property ? ' · ' + printable(item.property) + ': ' + printable(item.before) + ' → ' + printable(item.after) : '');
			})),
			h('h3', null, __('Quality review', 'nodera')),
			(response.quality || []).length === 0 ? h('p', null, __('No deterministic warnings detected.', 'nodera')) : h('ul', null, (response.quality || []).map(function (item, index) {
				return h('li', { key: index }, h('strong', null, printable(item.severity)), ': ', printable(item.message));
			})),
			h('h3', null, __('Candidate preview', 'nodera')),
			h('div', { className: 'nodera-preview' }, preview)
		);
	}

	function AiPanel(props) {
		var stateTask = useState(''); var task = stateTask[0]; var setTask = stateTask[1];
		var stateResult = useState(''); var result = stateResult[0]; var setResult = stateResult[1];
		var stateMode = useState('expanded'); var contractMode = stateMode[0]; var setContractMode = stateMode[1];
		var stateExported = useState(null); var exported = stateExported[0]; var setExported = stateExported[1];
		var statePatch = useState(null); var patch = statePatch[0]; var setPatch = statePatch[1];
		var stateValidated = useState(null); var validated = stateValidated[0]; var setValidated = stateValidated[1];
		var stateNotice = useState(null); var notice = stateNotice[0]; var setNotice = stateNotice[1];
		var targetIds = useMemo(function () { return flattenBlocks(props.target).map(function (block) { return block.attributes && block.attributes.noderaId; }).filter(function (id) { return typeof id === 'string'; }); }, [props.target]);

		async function exportContext() {
			try {
				var context = await buildAiContext({ task: task, target: props.target, ancestors: props.ancestors, siblings: props.siblings, postType: props.postType, postTitle: props.postTitle, mode: props.target.length === props.blocks.length ? 'create' : 'redesign', contractMode: contractMode, design: props.design });
				setExported(context);
				await navigator.clipboard.writeText(oneShotPrompt(context));
				setNotice({ status: 'success', message: __('AI prompt and context copied. Attach a reference image in your AI chat when needed.', 'nodera') });
			} catch (error) {
				setNotice({ status: 'error', message: error && error.message ? error.message : __('Could not export AI context.', 'nodera') });
			}
		}

		async function copyContext() {
			if (!exported) return;
			await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
			setNotice({ status: 'success', message: __('Context JSON copied.', 'nodera') });
		}

		function downloadBundle() {
			if (!exported) return;
			var bundle = { schema: 'nodera-ai-bundle/v1', context: exported, prompt: oneShotPrompt(exported) };
			var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
			var url = URL.createObjectURL(blob);
			var anchor = document.createElement('a');
			anchor.href = url; anchor.download = 'nodera-ai-bundle.json'; anchor.click(); URL.revokeObjectURL(url);
		}

		async function validate() {
			try {
				var parsed = normalizeAiResult(result);
				var response = await apiFetch({ path: '/nodera/v1/ai/validate', method: 'POST', data: { postId: props.postId, currentBlocks: stripBlocks(props.target), editableStableIds: targetIds, visualFacts: exported && exported.visualFacts ? exported.visualFacts : {}, patch: parsed } });
				setPatch(parsed); setValidated(response); setNotice(null);
			} catch (error) {
				setPatch(null); setValidated(null); setNotice({ status: 'error', message: error && error.message ? error.message : __('Validation failed.', 'nodera') });
			}
		}

		async function apply() {
			if (!patch || !validated) return;
			var currentFingerprint = await fingerprint(props.target);
			if (currentFingerprint !== patch.target.fingerprint) {
				setNotice({ status: 'error', message: __('Target changed after validation. Export and validate again.', 'nodera') });
				return;
			}
			applyPatch(patch, props.blocks);
			setNotice({ status: 'success', message: __('Changes applied locally. Save/Update the page to persist them. Native Gutenberg Undo can revert the change.', 'nodera') });
		}

		async function copyRepairPrompt() {
			if (!notice || notice.status !== 'error' || !exported) return;
			var prompt = ['Correct the Nodera patch validation problem below.', 'Error: ' + notice.message, 'Do not change the target. Return nodera-patch/v1 JSON only.', 'Original task: ' + task, 'Target: ' + JSON.stringify(exported.target)].join('\n');
			await navigator.clipboard.writeText(prompt);
		}

		return h('div', { className: 'nodera-panel' },
			h('p', { className: 'nodera-target' }, h('strong', null, __('Target', 'nodera') + ':'), ' ', props.target.length === props.blocks.length ? __('Whole page', 'nodera') : __('Selected subtree', 'nodera')),
			h(TextareaControl, { label: __('Task', 'nodera'), value: task, onChange: setTask, rows: 4 }),
			h(SelectControl, { label: __('Contract scope', 'nodera'), value: contractMode, options: [{ label: __('Focused', 'nodera'), value: 'focused' }, { label: __('Expanded', 'nodera'), value: 'expanded' }, { label: __('Full', 'nodera'), value: 'full' }], onChange: setContractMode }),
			h('div', { className: 'nodera-actions' }, h(Button, { variant: 'primary', onClick: exportContext, disabled: !task.trim() }, __('Copy for AI', 'nodera')), h(Button, { variant: 'secondary', onClick: copyContext, disabled: !exported }, __('Copy context', 'nodera')), h(Button, { variant: 'tertiary', onClick: downloadBundle, disabled: !exported }, __('Download bundle', 'nodera'))),
			h(TextareaControl, { label: __('Paste AI result', 'nodera'), value: result, onChange: setResult, rows: 9 }),
			h(Button, { variant: 'secondary', onClick: validate, disabled: !result.trim() }, __('Validate & Preview', 'nodera')),
			notice ? h(Notice, { status: notice.status, isDismissible: false }, notice.message) : null,
			notice && notice.status === 'error' && exported ? h(Button, { variant: 'tertiary', onClick: copyRepairPrompt }, __('Copy Repair Prompt', 'nodera')) : null,
			validated ? h(Review, { response: validated }) : null,
			validated && patch ? h(Button, { variant: 'primary', onClick: apply }, __('Apply locally', 'nodera')) : null
		);
	}

	var responsiveFields = [
		['paddingTop', 'Padding top'], ['paddingRight', 'Padding right'], ['paddingBottom', 'Padding bottom'], ['paddingLeft', 'Padding left'],
		['marginTop', 'Margin top'], ['marginRight', 'Margin right'], ['marginBottom', 'Margin bottom'], ['marginLeft', 'Margin left'],
		['gap', 'Gap'], ['width', 'Width'], ['minWidth', 'Min width'], ['maxWidth', 'Max width'], ['fontSize', 'Font size'], ['lineHeight', 'Line height']
	];
	function ResponsivePanel(props) {
		var deviceState = useState('tablet'); var device = deviceState[0]; var setDevice = deviceState[1];
		if (!props.block) return h('p', null, __('Select a block to edit responsive overrides.', 'nodera'));
		var responsive = props.block.attributes && props.block.attributes.noderaResponsive ? props.block.attributes.noderaResponsive : {};
		var values = responsive[device] || {};
		function setValue(key, value) {
			var nextDevice = Object.assign({}, values); if (value) nextDevice[key] = value; else delete nextDevice[key];
			var next = Object.assign({}, responsive); next[device] = nextDevice; props.update({ noderaResponsive: next });
		}
		function reset() { var next = Object.assign({}, responsive); next[device] = {}; props.update({ noderaResponsive: next }); }
		return h('div', { className: 'nodera-panel' },
			h('p', null, __('Desktop/base values remain owned by native Gutenberg controls. Nodera stores only responsive overrides.', 'nodera')),
			h(SelectControl, { label: __('Device override', 'nodera'), value: device, options: [{ label: __('Tablet', 'nodera'), value: 'tablet' }, { label: __('Mobile', 'nodera'), value: 'mobile' }], onChange: setDevice }),
			h('div', { className: 'nodera-field-grid' }, responsiveFields.map(function (field) { return h(TextControl, { key: field[0], label: __(field[1], 'nodera'), value: values[field[0]] || '', placeholder: 'e.g. 24px', onChange: function (value) { setValue(field[0], value); } }); })),
			h(SelectControl, { label: __('Flex direction', 'nodera'), value: values.flexDirection || '', options: [{ label: __('Inherit', 'nodera'), value: '' }, { label: 'row', value: 'row' }, { label: 'column', value: 'column' }, { label: 'row-reverse', value: 'row-reverse' }, { label: 'column-reverse', value: 'column-reverse' }], onChange: function (value) { setValue('flexDirection', value); } }),
			h(SelectControl, { label: __('Flex wrap', 'nodera'), value: values.flexWrap || '', options: [{ label: __('Inherit', 'nodera'), value: '' }, { label: 'nowrap', value: 'nowrap' }, { label: 'wrap', value: 'wrap' }], onChange: function (value) { setValue('flexWrap', value); } }),
			h(Button, { variant: 'tertiary', onClick: reset }, __('Reset this device', 'nodera'))
		);
	}

	function DesignPanel() {
		var recordState = useState(null); var record = recordState[0]; var setRecord = recordState[1];
		var originalState = useState(null); var original = originalState[0]; var setOriginal = originalState[1];
		var textState = useState(''); var text = textState[0]; var setText = textState[1];
		var bgState = useState(''); var background = bgState[0]; var setBackground = bgState[1];
		var errorState = useState(''); var error = errorState[0]; var setError = errorState[1];
		var theme = window.NoderaSettings && window.NoderaSettings.theme ? window.NoderaSettings.theme : '';
		useEffect(function () {
			if (!theme) return;
			apiFetch({ path: '/wp/v2/global-styles/themes/' + encodeURIComponent(theme) }).then(function (data) {
				setRecord(data); setOriginal(JSON.parse(JSON.stringify(data))); setText(data.styles && data.styles.color ? data.styles.color.text || '' : ''); setBackground(data.styles && data.styles.color ? data.styles.color.background || '' : '');
			}).catch(function (reason) { setError(reason && reason.message ? reason.message : __('Global Styles are not writable in this editor context.', 'nodera')); });
		}, [theme]);
		async function save(nextText, nextBackground) {
			if (!record || !record.id) return;
			var t = nextText !== undefined ? nextText : text; var b = nextBackground !== undefined ? nextBackground : background;
			var styles = Object.assign({}, record.styles || {}); styles.color = Object.assign({}, (record.styles && record.styles.color) || {}, { text: t || undefined, background: b || undefined });
			var updated = await apiFetch({ path: '/wp/v2/global-styles/' + record.id, method: 'PUT', data: { styles: styles } }); setRecord(updated);
		}
		async function reset() {
			if (!original) return; var t = original.styles && original.styles.color ? original.styles.color.text || '' : ''; var b = original.styles && original.styles.color ? original.styles.color.background || '' : ''; setText(t); setBackground(b); await save(t, b);
		}
		if (error) return h(Notice, { status: 'warning', isDismissible: false }, error);
		if (!record) return h('p', null, __('Loading native WordPress Global Styles…', 'nodera'));
		return h('div', { className: 'nodera-panel' }, h('p', null, __('These values are stored by WordPress Global Styles, not in a parallel Nodera design database.', 'nodera')), h(TextControl, { label: __('Text color', 'nodera'), value: text, placeholder: '#111111', onChange: setText }), h(TextControl, { label: __('Background color', 'nodera'), value: background, placeholder: '#ffffff', onChange: setBackground }), h('div', { className: 'nodera-actions' }, h(Button, { variant: 'primary', onClick: function () { save(); } }, __('Save Global Style', 'nodera')), h(Button, { variant: 'tertiary', onClick: reset }, __('Reset', 'nodera'))));
	}

	function DynamicPanel(props) {
		var valueState = useState(props.metaValue || ''); var value = valueState[0]; var setValue = valueState[1];
		useEffect(function () { setValue(props.metaValue || ''); }, [props.metaValue]);
		if (!props.block) return h('p', null, __('Select a Heading or Paragraph to connect dynamic data.', 'nodera'));
		var supported = ['core/heading', 'core/paragraph'].indexOf(props.block.name) !== -1;
		if (!supported) return h(Notice, { status: 'info', isDismissible: false }, __('The first Nodera binding workflow supports Heading and Paragraph content.', 'nodera'));
		var metadata = props.block.attributes && props.block.attributes.metadata ? props.block.attributes.metadata : {};
		var bindings = metadata.bindings || {};
		var connected = Boolean(bindings.content);
		function connect() { var nextBindings = Object.assign({}, bindings, { content: { source: 'core/post-meta', args: { key: (window.NoderaSettings && window.NoderaSettings.dynamicMeta) || 'nodera_dynamic_text' } } }); props.updateBlock({ metadata: Object.assign({}, metadata, { bindings: nextBindings }) }); }
		function disconnect() { var next = Object.assign({}, bindings); delete next.content; props.updateBlock({ metadata: Object.assign({}, metadata, { bindings: next }) }); }
		return h('div', { className: 'nodera-panel' }, h(TextControl, { label: __('Dynamic post-meta value', 'nodera'), value: value, onChange: setValue }), h(Button, { variant: 'secondary', onClick: function () { props.updateMeta(value); } }, __('Update source value', 'nodera')), h('p', null, h('strong', null, __('Source', 'nodera') + ':'), ' core/post-meta · ', window.NoderaSettings && window.NoderaSettings.dynamicMeta), connected ? h(Button, { variant: 'tertiary', onClick: disconnect }, __('Disconnect content', 'nodera')) : h(Button, { variant: 'primary', onClick: connect }, __('Connect content', 'nodera')));
	}

	function AdvancedPanel(props) {
		var diagnosticsState = useState(null); var diagnostics = diagnosticsState[0]; var setDiagnostics = diagnosticsState[1];
		var stateState = useState('hover'); var stateName = stateState[0]; var setStateName = stateState[1];
		useEffect(function () { apiFetch({ path: '/nodera/v1/diagnostics' }).then(setDiagnostics).catch(function () {}); }, []);
		if (!props.block) return h('p', null, __('Select a block for state styles and scoped CSS.', 'nodera'));
		var stateStyles = props.block.attributes && props.block.attributes.noderaStateStyles ? props.block.attributes.noderaStateStyles : {};
		var values = stateStyles[stateName] || {};
		function setStateValue(key, value) { var nextValues = Object.assign({}, values); if (value) nextValues[key] = value; else delete nextValues[key]; var next = Object.assign({}, stateStyles); next[stateName] = nextValues; props.update({ noderaStateStyles: next }); }
		return h('div', { className: 'nodera-panel' }, h(SelectControl, { label: __('State', 'nodera'), value: stateName, options: [{ label: 'Hover', value: 'hover' }, { label: 'Focus', value: 'focus' }, { label: 'Active', value: 'active' }], onChange: setStateName }), h(TextControl, { label: __('Opacity', 'nodera'), value: values.opacity || '', onChange: function (value) { setStateValue('opacity', value); } }), h(TextControl, { label: __('Border radius', 'nodera'), value: values.borderRadius || '', placeholder: '8px', onChange: function (value) { setStateValue('borderRadius', value); } }), h(TextareaControl, { label: __('Scoped Custom CSS', 'nodera'), help: __('Use only &, &:hover, &:focus or &:active. @import and remote URLs are rejected.', 'nodera'), value: String((props.block.attributes && props.block.attributes.noderaCustomCSS) || ''), onChange: function (value) { props.update({ noderaCustomCSS: value }); }, rows: 7 }), diagnostics ? h(Notice, { status: 'info', isDismissible: false }, h('code', null, JSON.stringify(diagnostics))) : null, h(Button, { variant: 'tertiary', onClick: function () { props.update({ noderaStateStyles: {}, noderaCustomCSS: '' }); } }, __('Reset advanced styles', 'nodera')));
	}

	function registerNoderaBlocks() {
		if (!blocksApi.registerBlockType || !RichText) return;
		if (!blocksApi.getBlockType('nodera/accordion')) {
			blocksApi.registerBlockType('nodera/accordion', {
				apiVersion: 3, title: __('Nodera Accordion', 'nodera'), category: 'design', icon: 'menu-alt3', attributes: { title: { type: 'string', default: 'Accordion title' }, content: { type: 'string', default: 'Accordion content' } }, supports: { html: false, align: ['wide', 'full'], spacing: { margin: true, padding: true } },
				edit: function (props) { return h('div', { className: 'nodera-accordion-editor' }, h(TextControl, { label: __('Accordion title', 'nodera'), value: props.attributes.title || '', onChange: function (title) { props.setAttributes({ title: title }); } }), h(RichText, { tagName: 'div', value: props.attributes.content || '', onChange: function (content) { props.setAttributes({ content: content }); }, placeholder: __('Accordion content…', 'nodera') })); },
				save: function () { return null; }
			});
		}
		if (!blocksApi.getBlockType('nodera/tabs')) {
			blocksApi.registerBlockType('nodera/tabs', {
				apiVersion: 3, title: __('Nodera Tabs', 'nodera'), category: 'design', icon: 'index-card', attributes: { items: { type: 'array', default: [{ label: 'Tab one', content: 'First tab content' }, { label: 'Tab two', content: 'Second tab content' }] } }, supports: { html: false, align: ['wide', 'full'], spacing: { margin: true, padding: true } },
				edit: function (props) { var items = Array.isArray(props.attributes.items) ? props.attributes.items : []; function update(index, key, value) { props.setAttributes({ items: items.map(function (item, itemIndex) { if (itemIndex !== index) return item; var changed = {}; changed[key] = value; return Object.assign({}, item, changed); }) }); } return h('div', { className: 'nodera-tabs-editor' }, items.map(function (item, index) { return h('div', { className: 'nodera-tab-editor', key: index }, h(TextControl, { label: __('Tab label', 'nodera'), value: item.label || '', onChange: function (value) { update(index, 'label', value); } }), h(RichText, { tagName: 'div', value: item.content || '', onChange: function (value) { update(index, 'content', value); } }), h(Button, { isDestructive: true, variant: 'tertiary', onClick: function () { props.setAttributes({ items: items.filter(function (_, i) { return i !== index; }) }); } }, __('Remove tab', 'nodera'))); }), h(Button, { variant: 'secondary', onClick: function () { props.setAttributes({ items: items.concat([{ label: __('New tab', 'nodera'), content: '' }]) }); } }, __('Add tab', 'nodera'))); },
				save: function () { return null; }
			});
		}
	}

	function Sidebar() {
		useEffect(function () { return startIdentityReconciler(); }, []);
		var state = data.useSelect(function (select) {
			var be = select('core/block-editor'); var editor = select('core/editor'); var clientId = be.getSelectedBlockClientId(); var pageBlocks = be.getBlocks() || []; var selected = clientId ? be.getBlock(clientId) : null; var parentIds = clientId ? be.getBlockParents(clientId) : []; var ancestors = parentIds.map(function (id) { return be.getBlock(id); }).filter(Boolean); var rootId = clientId ? be.getBlockRootClientId(clientId) : ''; var siblings = clientId ? (be.getBlocks(rootId) || []).filter(function (block) { return block.clientId !== clientId; }) : []; var settings = be.getSettings ? be.getSettings() : {};
			return { blocks: pageBlocks, selected: selected, ancestors: ancestors, siblings: siblings, postId: Number(editor.getCurrentPostId()), postType: String(editor.getCurrentPostType ? editor.getCurrentPostType() : ''), postTitle: String(editor.getEditedPostAttribute ? editor.getEditedPostAttribute('title') || '' : ''), meta: editor.getEditedPostAttribute ? (editor.getEditedPostAttribute('meta') || {}) : {}, design: { colors: settings.colors || [], gradients: settings.gradients || [], fontSizes: settings.fontSizes || [], spacingUnits: settings.spacingUnits || [] } };
		}, []);
		var blockActions = data.useDispatch('core/block-editor'); var editorActions = data.useDispatch('core/editor'); var target = state.selected ? [state.selected] : state.blocks;
		function updateSelected(attributes) { if (state.selected && state.selected.clientId) blockActions.updateBlockAttributes(state.selected.clientId, attributes); }
		function updateMeta(value) { var key = (window.NoderaSettings && window.NoderaSettings.dynamicMeta) || 'nodera_dynamic_text'; var nextMeta = Object.assign({}, state.meta); nextMeta[key] = value; editorActions.editPost({ meta: nextMeta }); }
		var tabs = [{ name: 'ai', title: __('AI', 'nodera') }, { name: 'responsive', title: __('Responsive', 'nodera') }, { name: 'design', title: __('Design', 'nodera') }, { name: 'dynamic', title: __('Dynamic', 'nodera') }, { name: 'advanced', title: __('Advanced', 'nodera') }];
		return h(Fragment, null,
			PluginSidebarMoreMenuItem ? h(PluginSidebarMoreMenuItem, { target: 'nodera-studio' }, __('Nodera Studio', 'nodera')) : null,
			PluginSidebar ? h(PluginSidebar, { name: 'nodera-studio', title: __('Nodera Studio', 'nodera') }, h(PanelBody, { initialOpen: true }, h(TabPanel, { className: 'nodera-tabs', tabs: tabs }, function (tab) {
				if (tab.name === 'ai') return h(AiPanel, { blocks: state.blocks, target: target, ancestors: state.ancestors, siblings: state.siblings, postId: state.postId, postType: state.postType, postTitle: state.postTitle, design: state.design });
				if (tab.name === 'responsive') return h(ResponsivePanel, { block: state.selected, update: updateSelected });
				if (tab.name === 'design') return h(DesignPanel);
				if (tab.name === 'dynamic') return h(DynamicPanel, { block: state.selected, metaValue: String(state.meta[((window.NoderaSettings && window.NoderaSettings.dynamicMeta) || 'nodera_dynamic_text')] || ''), updateBlock: updateSelected, updateMeta: updateMeta });
				return h(AdvancedPanel, { block: state.selected, update: updateSelected });
			}))) : h(Notice, { status: 'error', isDismissible: false }, __('This WordPress editor does not expose PluginSidebar APIs required by Nodera.', 'nodera'))
		);
	}

	registerNoderaBlocks();
	wp.plugins.registerPlugin('nodera', { render: Sidebar });
})(window.wp);
