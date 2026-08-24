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

  function flatten(items) {
    var out = [];
    (items || []).forEach(function (block) { out.push(block); out = out.concat(flatten(block.innerBlocks || [])); });
    return out;
  }
  function strip(block) { return { name: block.name, attributes: block.attributes || {}, innerBlocks: (block.innerBlocks || []).map(strip) }; }
  function stripBlocks(items) { return (items || []).map(strip); }
  function newId() {
    var bytes = crypto.getRandomValues(new Uint8Array(12));
    return 'nd_' + Array.from(bytes, function (v) { return v.toString(36).padStart(2, '0'); }).join('').slice(0, 24);
  }
  function ensureIds(items) {
    var seen = new Set();
    var actions = data.dispatch('core/block-editor');
    flatten(items).forEach(function (block) {
      if (!block.clientId) return;
      var id = block.attributes && block.attributes.noderaId;
      if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id)) actions.updateBlockAttributes(block.clientId, { noderaId: newId() });
      else seen.add(id);
    });
  }
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce(function (o, key) { o[key] = canonical(value[key]); return o; }, {});
    return value;
  }
  async function fingerprint(items) {
    var bytes = new TextEncoder().encode(JSON.stringify(canonical(stripBlocks(items))));
    var hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function idToClient(items, stableId) {
    var found = flatten(items).find(function (block) { return block.attributes && block.attributes.noderaId === stableId; });
    return found && found.clientId;
  }
  function materialize(spec) { return blocksApi.createBlock(spec.name, spec.attributes || {}, (spec.innerBlocks || []).map(materialize)); }
  function applyPatch(patch, pageBlocks) {
    var actions = data.dispatch('core/block-editor');
    var selectors = data.select('core/block-editor');
    (patch.operations || []).forEach(function (op) {
      var id = op.stableId ? idToClient(pageBlocks, op.stableId) : undefined;
      if (op.op === 'updateAttributes' && id) actions.updateBlockAttributes(id, op.attributes || {});
      else if (op.op === 'removeBlock' && id) actions.removeBlocks([id]);
      else if (op.op === 'replaceBlock' && id && op.block) actions.replaceBlocks(id, materialize(op.block));
      else if (op.op === 'replaceInnerBlocks' && id && op.blocks) actions.replaceInnerBlocks(id, op.blocks.map(materialize), false);
      else if (op.op === 'insertBlock' && op.block) actions.insertBlocks(materialize(op.block), op.index, op.parentStableId ? idToClient(pageBlocks, op.parentStableId) : undefined);
      else if (op.op === 'moveBlock' && id) actions.moveBlocksToPosition([id], selectors.getBlockRootClientId(id) || '', op.toParentStableId ? idToClient(pageBlocks, op.toParentStableId) : '', op.index || 0);
    });
  }
  function sameOriginDocuments() {
    var docs = [document];
    document.querySelectorAll('iframe').forEach(function (frame) { try { if (frame.contentDocument) docs.push(frame.contentDocument); } catch (e) {} });
    return docs;
  }
  function blockElement(clientId) {
    var safe = window.CSS && CSS.escape ? CSS.escape(clientId) : clientId.replace(/[^a-zA-Z0-9_-]/g, '');
    var docs = sameOriginDocuments();
    for (var i = 0; i < docs.length; i += 1) { var el = docs[i].querySelector('[data-block="' + safe + '"]'); if (el) return el; }
    return null;
  }
  function capture(target) {
    var nodes = {};
    flatten(target).forEach(function (block) {
      if (!block.clientId || !block.attributes || !block.attributes.noderaId) return;
      var el = blockElement(block.clientId); if (!el) return;
      var view = el.ownerDocument.defaultView || window, rect = el.getBoundingClientRect(), style = view.getComputedStyle(el);
      nodes[block.attributes.noderaId] = {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, display: style.display, position: style.position,
        visibility: style.visibility, opacity: style.opacity, color: style.color, backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight,
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft], margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft],
        gap: style.gap, borderRadius: style.borderRadius, horizontalOverflow: el.scrollWidth > el.clientWidth + 1,
        zeroSize: rect.width <= 0 || rect.height <= 0
      };
    });
    return { browser: { measuredGeometry: Object.keys(nodes).length > 0, captureStatus: Object.keys(nodes).length ? 'ok' : 'unavailable', viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio }, nodes: nodes } };
  }
  function normalize(input) {
    var clean = String(input || '').replace(/^\uFEFF/, '').trim();
    var fenced = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i); if (fenced) clean = fenced[1].trim();
    try { return JSON.parse(clean); } catch (first) {
      var start = clean.indexOf('{'), end = clean.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
      throw first;
    }
  }
  function useContext(clientId) {
    return data.useSelect(function (select) {
      var editor = select('core/editor'), blockEditor = select('core/block-editor');
      var blocks = blockEditor.getBlocks() || [], selected = clientId ? blockEditor.getBlock(clientId) : null;
      var parents = clientId ? blockEditor.getBlockParents(clientId) : [], root = clientId ? blockEditor.getBlockRootClientId(clientId) : '';
      var settings = blockEditor.getSettings ? blockEditor.getSettings() : {};
      return {
        blocks: blocks, selected: selected, ancestors: parents.map(function (id) { return blockEditor.getBlock(id); }).filter(Boolean),
        siblings: clientId ? (blockEditor.getBlocks(root) || []).filter(function (b) { return b.clientId !== clientId; }) : [],
        postId: Number(editor.getCurrentPostId()), postType: String(editor.getCurrentPostType ? editor.getCurrentPostType() : ''),
        postTitle: String(editor.getEditedPostAttribute ? editor.getEditedPostAttribute('title') || '' : ''),
        meta: editor.getEditedPostAttribute ? (editor.getEditedPostAttribute('meta') || {}) : {},
        design: { colors: settings.colors || [], gradients: settings.gradients || [], fontSizes: settings.fontSizes || [], spacingUnits: settings.spacingUnits || [] }
      };
    }, [clientId]);
  }
  function freshTarget(context, pageMode) {
    var store = data.select('core/block-editor');
    if (pageMode) return store.getBlocks() || [];
    return context.selected && context.selected.clientId ? [store.getBlock(context.selected.clientId)].filter(Boolean) : [];
  }
  async function buildContext(context, target, task, mode) {
    var ids = flatten(target).map(function (b) { return b.attributes && b.attributes.noderaId; }).filter(function (id) { return typeof id === 'string'; });
    var names = Array.from(new Set(flatten(target).map(function (b) { return b.name; })));
    var contracts = await apiFetch({ path: '/nodera/v1/contracts?mode=' + encodeURIComponent(mode || 'expanded') + '&task=' + encodeURIComponent(task) + '&blocks=' + encodeURIComponent(names.join(',')) });
    return {
      schema: 'nodera-ai-context/v1', task: { request: task, mode: target.length === context.blocks.length ? 'create' : 'redesign' },
      target: { kind: target.length === context.blocks.length ? 'page' : 'subtree', stableIds: ids, fingerprint: await fingerprint(target) },
      document: { postType: context.postType, title: context.postTitle, scopeTree: stripBlocks(target) },
      context: { ancestors: stripBlocks(context.ancestors), siblings: stripBlocks(context.siblings) }, contracts: contracts, design: context.design, visualFacts: capture(target),
      nativeWordPress: { responsiveStyleStates: ['@tablet', '@mobile'], pseudoStyleStates: { 'core/button': [':hover', ':focus', ':focus-visible', ':active'], 'core/navigation-link': [':hover', ':focus', ':focus-visible', ':active'] }, preferredDesignBlocks: ['core/accordion', 'core/tabs'] },
      environment: { wordpressVersion: window.NoderaSettings.wordpress, noderaVersion: window.NoderaSettings.version }, limits: { maxOperations: 200, maxPayloadBytes: 524288 }, output: { schema: 'nodera-patch/v1' }
    };
  }
  function oneShotPrompt(context) {
    return ['You are editing a native WordPress 7.1+ Gutenberg document through Nodera.', 'Return ONLY one nodera-patch/v1 JSON object.', 'Use only supplied contracts and target stable IDs; never escape scope or invent attributes.', 'Prefer Core blocks, Block Supports, Global Styles, Block Bindings and native style states.', 'Use style.@tablet/style.@mobile and supported :hover/:focus/:focus-visible/:active states. Use Core Accordion/Tabs.', '', JSON.stringify(context, null, 2)].join('\n');
  }
  function Review(props) {
    var response = props.response;
    var preview = null;
    if (be.BlockPreview) { try { preview = h(be.BlockPreview, { blocks: (response.candidate || []).map(materialize), viewportWidth: 960 }); } catch (e) {} }
    return h('div', { className: 'nodera-review' },
      h('h3', null, __('Semantic diff', 'nodera')),
      (response.diff || []).length ? h('ul', { className: 'nodera-diff' }, response.diff.slice(0, 30).map(function (item, i) { return h('li', { key: i }, String(item.type || 'change'), item.blockName ? ' · ' + item.blockName : '', item.property ? ' · ' + item.property : ''); })) : h('p', null, __('No structural changes.', 'nodera')),
      h('h3', null, __('Quality review', 'nodera')),
      (response.quality || []).length ? h('ul', null, response.quality.slice(0, 20).map(function (item, i) { return h('li', { key: i }, String(item.severity || 'info') + ': ' + String(item.message || '')); })) : h('p', null, __('No deterministic warnings detected.', 'nodera')),
      preview ? h(Fragment, null, h('h3', null, __('Candidate preview', 'nodera')), h('div', { className: 'nodera-preview' }, preview)) : null
    );
  }
  function AiPanel(props) {
    var context = props.context, pageMode = !!props.pageMode;
    var ts = useState(''), task = ts[0], setTask = ts[1];
    var ms = useState('expanded'), contractMode = ms[0], setContractMode = ms[1];
    var ls = useState(false), loading = ls[0], setLoading = ls[1];
    var rs = useState(null), response = rs[0], setResponse = rs[1];
    var ns = useState(null), notice = ns[0], setNotice = ns[1];
    var es = useState(null), exported = es[0], setExported = es[1];
    var xs = useState(''), external = xs[0], setExternal = xs[1];
    var provider = window.NoderaSettings && window.NoderaSettings.aiProvider;

    async function prepare() {
      var initial = pageMode ? context.blocks : (context.selected ? [context.selected] : []); ensureIds(initial);
      await new Promise(function (resolve) { requestAnimationFrame(resolve); });
      var target = freshTarget(context, pageMode);
      var ctx = await buildContext(context, target, task, contractMode); setExported(ctx); return { target: target, ctx: ctx };
    }
    async function generate() {
      if (!task.trim()) return; setLoading(true); setNotice(null); setResponse(null);
      try {
        var prepared = await prepare();
        var ids = prepared.ctx.target.stableIds;
        var generated = await apiFetch({ path: '/nodera/v1/ai/generate', method: 'POST', data: { postId: context.postId, context: prepared.ctx, currentBlocks: stripBlocks(prepared.target), editableStableIds: ids, visualFacts: prepared.ctx.visualFacts } });
        setResponse(generated); setNotice({ status: 'success', message: __('Generated and validated. Review before Apply.', 'nodera') });
      } catch (error) { setNotice({ status: 'warning', message: error && error.message ? error.message : __('AI generation failed.', 'nodera') }); }
      finally { setLoading(false); }
    }
    async function copyForExternal() {
      if (!task.trim()) return;
      try { var p = await prepare(); await navigator.clipboard.writeText(oneShotPrompt(p.ctx)); setNotice({ status: 'success', message: __('AI context copied.', 'nodera') }); }
      catch (error) { setNotice({ status: 'error', message: error && error.message ? error.message : __('Could not copy context.', 'nodera') }); }
    }
    async function validateExternal() {
      try {
        var patch = normalize(external); var p = await prepare();
        var validated = await apiFetch({ path: '/nodera/v1/ai/validate', method: 'POST', data: { postId: context.postId, currentBlocks: stripBlocks(p.target), editableStableIds: p.ctx.target.stableIds, visualFacts: p.ctx.visualFacts, patch: patch } });
        validated.patch = patch; setResponse(validated); setNotice({ status: 'success', message: __('External patch validated.', 'nodera') });
      } catch (error) { setResponse(null); setNotice({ status: 'error', message: error && error.message ? error.message : __('Validation failed.', 'nodera') }); }
    }
    async function apply() {
      if (!response || !response.patch) return;
      var target = freshTarget(context, pageMode);
      if (await fingerprint(target) !== response.patch.target.fingerprint) { setNotice({ status: 'error', message: __('Target changed. Generate or validate again.', 'nodera') }); return; }
      applyPatch(response.patch, data.select('core/block-editor').getBlocks() || context.blocks); setNotice({ status: 'success', message: __('Applied to Gutenberg. Use native Undo or Save/Update.', 'nodera') });
    }
    return h('div', { className: 'nodera-native-ai' },
      provider && provider.configured ? h(c.Notice, { status: 'success', isDismissible: false }, __('Direct AI', 'nodera') + ': ' + provider.provider + (provider.model ? ' · ' + provider.model : '')) : h(c.Notice, { status: 'warning', isDismissible: false }, __('Direct AI is not configured. ', 'nodera'), window.NoderaSettings.settingsUrl ? h('a', { href: window.NoderaSettings.settingsUrl }, __('Configure provider', 'nodera')) : null),
      h(c.TextareaControl, { label: __('What should Nodera change?', 'nodera'), value: task, rows: 3, onChange: setTask }),
      h(c.SelectControl, { label: __('AI contract scope', 'nodera'), value: contractMode, options: [{ label: __('Focused', 'nodera'), value: 'focused' }, { label: __('Expanded', 'nodera'), value: 'expanded' }, { label: __('Full', 'nodera'), value: 'full' }], onChange: setContractMode }),
      h(c.Button, { variant: 'primary', disabled: !task.trim() || loading || !(provider && provider.configured), onClick: generate }, loading ? h(Fragment, null, c.Spinner ? h(c.Spinner) : null, ' ', __('Generating…', 'nodera')) : __('Generate in Gutenberg', 'nodera')),
      notice ? h(c.Notice, { status: notice.status, isDismissible: false }, notice.message) : null,
      response ? h(Review, { response: response }) : null,
      response && response.patch ? h(c.Button, { variant: 'primary', onClick: apply }, __('Apply to Gutenberg', 'nodera')) : null,
      h('details', { className: 'nodera-manual-ai' }, h('summary', null, __('Manual external AI fallback', 'nodera')),
        h(c.Button, { variant: 'secondary', disabled: !task.trim(), onClick: copyForExternal }, __('Copy for external AI', 'nodera')),
        exported ? h(c.Button, { variant: 'tertiary', onClick: function () { navigator.clipboard.writeText(JSON.stringify(exported, null, 2)); } }, __('Copy context JSON', 'nodera')) : null,
        h(c.TextareaControl, { label: __('Paste nodera-patch/v1 result', 'nodera'), value: external, rows: 8, onChange: setExternal }),
        h(c.Button, { variant: 'secondary', disabled: !external.trim(), onClick: validateExternal }, __('Validate & Preview', 'nodera'))
      )
    );
  }
  function Responsive(props) {
    var ds = useState('tablet'), device = ds[0], setDevice = ds[1], style = props.attributes.style || {}, key = device === 'tablet' ? '@tablet' : '@mobile', state = style[key] || {};
    function patch(group, value) { var next = Object.assign({}, state); next[group] = Object.assign({}, state[group] || {}, value); var all = Object.assign({}, style); all[key] = next; props.setAttributes({ style: all }); }
    function edges(v) { return v ? { top: v, right: v, bottom: v, left: v } : undefined; }
    function reset() { var all = Object.assign({}, style); delete all[key]; props.setAttributes({ style: all }); }
    return h('div', { className: 'nodera-native-controls' }, h(c.Notice, { status: 'info', isDismissible: false }, __('Uses WordPress 7.1 native viewport style states.', 'nodera')), h(c.SelectControl, { label: __('Viewport', 'nodera'), value: device, options: [{ label: 'Tablet', value: 'tablet' }, { label: 'Mobile', value: 'mobile' }], onChange: setDevice }), h(c.TextControl, { label: __('Padding (all sides)', 'nodera'), value: state.spacing && state.spacing.padding ? state.spacing.padding.top || '' : '', placeholder: '24px', onChange: function (v) { patch('spacing', { padding: edges(v) }); } }), h(c.TextControl, { label: __('Margin (all sides)', 'nodera'), value: state.spacing && state.spacing.margin ? state.spacing.margin.top || '' : '', placeholder: '0px', onChange: function (v) { patch('spacing', { margin: edges(v) }); } }), h(c.TextControl, { label: __('Block gap', 'nodera'), value: state.spacing && typeof state.spacing.blockGap === 'string' ? state.spacing.blockGap : '', placeholder: '16px', onChange: function (v) { patch('spacing', { blockGap: v || undefined }); } }), h(c.TextControl, { label: __('Font size', 'nodera'), value: state.typography ? state.typography.fontSize || '' : '', placeholder: '32px', onChange: function (v) { patch('typography', { fontSize: v || undefined }); } }), h(c.TextControl, { label: __('Line height', 'nodera'), value: state.typography ? state.typography.lineHeight || '' : '', onChange: function (v) { patch('typography', { lineHeight: v || undefined }); } }), h(c.TextControl, { label: __('Text color', 'nodera'), value: state.color ? state.color.text || '' : '', onChange: function (v) { patch('color', { text: v || undefined }); } }), h(c.TextControl, { label: __('Background color', 'nodera'), value: state.color ? state.color.background || '' : '', onChange: function (v) { patch('color', { background: v || undefined }); } }), h(c.Button, { variant: 'tertiary', onClick: reset }, __('Reset viewport', 'nodera')));
  }
  var BINDABLE = { 'core/image': ['id', 'url', 'title', 'alt', 'caption'], 'core/heading': ['content'], 'core/paragraph': ['content'], 'core/button': ['url', 'text', 'linkTarget', 'rel'], 'core/navigation-link': ['url'], 'core/navigation-submenu': ['url'], 'core/post-date': ['datetime'] };
  function Dynamic(props) {
    var attributes = BINDABLE[props.name] || [];
    var as = useState(attributes[0] || ''), attribute = as[0], setAttribute = as[1];
    var ss = useState('meta'), source = ss[0], setSource = ss[1];
    if (!attributes.length) return h(c.Notice, { status: 'info', isDismissible: false }, __('This block does not expose a supported Core Block Bindings attribute.', 'nodera'));
    if (attributes.indexOf(attribute) === -1) attribute = attributes[0];
    var metadata = props.attributes.metadata || {}, bindings = metadata.bindings || {}, key = window.NoderaSettings.dynamicMeta, connected = Boolean(bindings[attribute]);
    function declaration() { if (source === 'meta') return { source: 'core/post-meta', args: { key: key } }; if (source === 'date') return { source: 'core/post-data', args: { field: 'date' } }; if (source === 'modified') return { source: 'core/post-data', args: { field: 'modified' } }; return { source: 'core/post-data', args: { field: 'link' } }; }
    function connect() { var next = Object.assign({}, bindings); next[attribute] = declaration(); props.setAttributes({ metadata: Object.assign({}, metadata, { bindings: next }) }); }
    function disconnect() { var next = Object.assign({}, bindings); delete next[attribute]; props.setAttributes({ metadata: Object.assign({}, metadata, { bindings: next }) }); }
    return h('div', { className: 'nodera-native-controls' }, h(c.Notice, { status: 'info', isDismissible: false }, __('Uses the native WordPress Block Bindings API.', 'nodera')), h(c.SelectControl, { label: __('Bound attribute', 'nodera'), value: attribute, options: attributes.map(function (v) { return { label: v, value: v }; }), onChange: setAttribute }), h(c.SelectControl, { label: __('Source', 'nodera'), value: source, options: [{ label: __('Nodera safe post meta', 'nodera'), value: 'meta' }, { label: __('Post publication date', 'nodera'), value: 'date' }, { label: __('Post modified date', 'nodera'), value: 'modified' }, { label: __('Post permalink', 'nodera'), value: 'link' }], onChange: setSource }), connected ? h(c.Button, { variant: 'tertiary', onClick: disconnect }, __('Disconnect attribute', 'nodera')) : h(c.Button, { variant: 'primary', onClick: connect }, __('Connect dynamic data', 'nodera')));
  }
  function States(props) {
    var allowed = ['core/button', 'core/navigation-link'].indexOf(props.name) !== -1;
    if (!allowed) return h('div', null, h(c.Notice, { status: 'info', isDismissible: false }, __('WordPress 7.1 currently exposes block-instance pseudo states here for Button and Navigation Link. Nodera does not invent a parallel state engine.', 'nodera')), h(c.TextareaControl, { label: __('Scoped Custom CSS fallback', 'nodera'), value: String(props.attributes.noderaCustomCSS || ''), rows: 5, onChange: function (v) { props.setAttributes({ noderaCustomCSS: v }); } }));
    var ss = useState(':hover'), stateName = ss[0], setStateName = ss[1], style = props.attributes.style || {}, state = style[stateName] || {};
    function patch(group, value) { var next = Object.assign({}, state); next[group] = Object.assign({}, state[group] || {}, value); var all = Object.assign({}, style); all[stateName] = next; props.setAttributes({ style: all }); }
    return h('div', { className: 'nodera-native-controls' }, h(c.Notice, { status: 'info', isDismissible: false }, __('Uses native WordPress pseudo style states.', 'nodera')), h(c.SelectControl, { label: __('State', 'nodera'), value: stateName, options: [{ label: 'Hover', value: ':hover' }, { label: 'Focus', value: ':focus' }, { label: 'Focus visible', value: ':focus-visible' }, { label: 'Active', value: ':active' }], onChange: setStateName }), h(c.TextControl, { label: __('Text color', 'nodera'), value: state.color ? state.color.text || '' : '', onChange: function (v) { patch('color', { text: v || undefined }); } }), h(c.TextControl, { label: __('Background color', 'nodera'), value: state.color ? state.color.background || '' : '', onChange: function (v) { patch('color', { background: v || undefined }); } }), h(c.TextareaControl, { label: __('Scoped Custom CSS fallback', 'nodera'), value: String(props.attributes.noderaCustomCSS || ''), rows: 5, onChange: function (v) { props.setAttributes({ noderaCustomCSS: v }); } }));
  }
  function GlobalDesign() {
    var rs = useState(null), record = rs[0], setRecord = rs[1];
    var vs = useState({}), values = vs[0], setValues = vs[1];
    var es = useState(''), error = es[0], setError = es[1];
    var theme = window.NoderaSettings.theme || '';
    function fromRecord(d) { return { text: d.styles && d.styles.color ? d.styles.color.text || '' : '', background: d.styles && d.styles.color ? d.styles.color.background || '' : '', link: d.styles && d.styles.elements && d.styles.elements.link && d.styles.elements.link.color ? d.styles.elements.link.color.text || '' : '', fontSize: d.styles && d.styles.typography ? d.styles.typography.fontSize || '' : '', lineHeight: d.styles && d.styles.typography ? d.styles.typography.lineHeight || '' : '', blockGap: d.styles && d.styles.spacing ? d.styles.spacing.blockGap || '' : '', buttonText: d.styles && d.styles.blocks && d.styles.blocks['core/button'] && d.styles.blocks['core/button'].color ? d.styles.blocks['core/button'].color.text || '' : '', buttonBackground: d.styles && d.styles.blocks && d.styles.blocks['core/button'] && d.styles.blocks['core/button'].color ? d.styles.blocks['core/button'].color.background || '' : '', buttonRadius: d.styles && d.styles.blocks && d.styles.blocks['core/button'] && d.styles.blocks['core/button'].border ? d.styles.blocks['core/button'].border.radius || '' : '' }; }
    useEffect(function () { if (!theme) return; apiFetch({ path: '/wp/v2/global-styles/themes/' + encodeURIComponent(theme) }).then(function (d) { setRecord(d); setValues(fromRecord(d)); }).catch(function (e) { setError(e && e.message ? e.message : __('Global Styles unavailable.', 'nodera')); }); }, [theme]);
    async function save() {
      if (!record || !record.id) return;
      var styles = Object.assign({}, record.styles || {}); styles.color = Object.assign({}, styles.color || {}, { text: values.text || undefined, background: values.background || undefined }); styles.typography = Object.assign({}, styles.typography || {}, { fontSize: values.fontSize || undefined, lineHeight: values.lineHeight || undefined }); styles.spacing = Object.assign({}, styles.spacing || {}, { blockGap: values.blockGap || undefined }); styles.elements = Object.assign({}, styles.elements || {}, { link: Object.assign({}, styles.elements && styles.elements.link || {}, { color: Object.assign({}, styles.elements && styles.elements.link && styles.elements.link.color || {}, { text: values.link || undefined }) }) }); styles.blocks = Object.assign({}, styles.blocks || {}, { 'core/button': Object.assign({}, styles.blocks && styles.blocks['core/button'] || {}, { color: Object.assign({}, styles.blocks && styles.blocks['core/button'] && styles.blocks['core/button'].color || {}, { text: values.buttonText || undefined, background: values.buttonBackground || undefined }), border: Object.assign({}, styles.blocks && styles.blocks['core/button'] && styles.blocks['core/button'].border || {}, { radius: values.buttonRadius || undefined }) }) });
      var updated = await apiFetch({ path: '/wp/v2/global-styles/' + record.id, method: 'PUT', data: { styles: styles } }); setRecord(updated); setValues(fromRecord(updated));
    }
    function field(key, label, placeholder) { return h(c.TextControl, { key: key, label: __(label, 'nodera'), value: values[key] || '', placeholder: placeholder || '', onChange: function (v) { var next = Object.assign({}, values); next[key] = v; setValues(next); } }); }
    if (error) return h(c.Notice, { status: 'warning', isDismissible: false }, error); if (!record) return h('p', null, __('Loading native WordPress Global Styles…', 'nodera'));
    return h('div', { className: 'nodera-panel' }, h(c.Notice, { status: 'info', isDismissible: false }, __('Stored by WordPress Global Styles, not a Nodera design database.', 'nodera')), field('text', 'Site text color'), field('background', 'Site background'), field('link', 'Link color'), field('fontSize', 'Base font size', '1rem'), field('lineHeight', 'Base line height', '1.5'), field('blockGap', 'Global block gap', '1.5rem'), field('buttonText', 'Button text color'), field('buttonBackground', 'Button background'), field('buttonRadius', 'Button radius', '8px'), h(c.Button, { variant: 'primary', onClick: save }, __('Save Global Styles', 'nodera')));
  }
  function withControls(BlockEdit) {
    return function (props) {
      if (!props.isSelected) return h(BlockEdit, props);
      var context = useContext(props.clientId); if (!context.selected) return h(BlockEdit, props);
      useEffect(function () { ensureIds([context.selected]); }, [context.selected.clientId]);
      return h(Fragment, null, h(BlockEdit, props),
        h(be.BlockControls, { group: 'other' }, h(c.ToolbarGroup, null, h(c.Dropdown, { popoverProps: { placement: 'bottom-start', className: 'nodera-ai-popover' }, renderToggle: function (t) { return h(c.ToolbarButton, { icon: 'superhero-alt', label: __('Nodera AI', 'nodera'), isPressed: t.isOpen, onClick: t.onToggle }, __('AI', 'nodera')); }, renderContent: function () { return h('div', { className: 'nodera-toolbar-ai' }, h(AiPanel, { context: context })); } }))),
        h(be.InspectorControls, null, h(c.PanelBody, { title: __('✦ Nodera AI', 'nodera'), initialOpen: false }, h(AiPanel, { context: context })), h(c.PanelBody, { title: __('Responsive', 'nodera'), initialOpen: false }, h(Responsive, props)), h(c.PanelBody, { title: __('Dynamic Data', 'nodera'), initialOpen: false }, h(Dynamic, props)), h(c.PanelBody, { title: __('States & Effects', 'nodera'), initialOpen: false }, h(States, props)))
      );
    };
  }
  wp.hooks.addFilter('editor.BlockEdit', 'nodera/gutenberg-native-controls', withControls);

  var editorPkg = wp.editor || wp.editPost || {}, PluginSidebar = editorPkg.PluginSidebar, PluginSidebarMoreMenuItem = editorPkg.PluginSidebarMoreMenuItem;
  function PageTools() {
    var context = useContext();
    return h(Fragment, null,
      PluginSidebarMoreMenuItem ? h(PluginSidebarMoreMenuItem, { target: 'nodera-page-tools' }, __('Nodera', 'nodera')) : null,
      PluginSidebar ? h(PluginSidebar, { name: 'nodera-page-tools', title: __('Nodera', 'nodera'), icon: 'superhero-alt' }, h(c.PanelBody, { title: __('Build Page with AI', 'nodera'), initialOpen: true }, h(AiPanel, { context: context, pageMode: true })), h(c.PanelBody, { title: __('Global Design', 'nodera'), initialOpen: false }, h(GlobalDesign)), h(c.PanelBody, { title: __('Gutenberg-native architecture', 'nodera'), initialOpen: false }, h(c.Notice, { status: 'info', isDismissible: false }, __('post_content, List View, Undo/Redo, Save, revisions, rendering, responsive states and supported pseudo states remain owned by WordPress.', 'nodera')))) : null
    );
  }
  wp.plugins.registerPlugin('nodera', { render: PageTools });
})(window.wp);
