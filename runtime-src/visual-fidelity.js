(function (wp) {
	'use strict';

	if (!wp || !wp.data || !wp.element || !wp.plugins || !wp.editor || !wp.components || !wp.apiFetch) {
		return;
	}

	window.NoderaVisualFidelity = '2.0';

	var h = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useState = wp.element.useState;
	var __ = wp.i18n.__;
	var data = wp.data;
	var useSelect = data.useSelect;
	var apiFetch = wp.apiFetch;
	var PluginSidebar = wp.editor.PluginSidebar;
	var Button = wp.components.Button;
	var CheckboxControl = wp.components.CheckboxControl;
	var Notice = wp.components.Notice;
	var SelectControl = wp.components.SelectControl;
	var Spinner = wp.components.Spinner;
	var TextareaControl = wp.components.TextareaControl;
	var ID_RE = /^nd_[a-z0-9]{12,40}$/;
	var DEVICE_SPECS = [
		{ key: 'desktop', type: 'Desktop' },
		{ key: 'tablet', type: 'Tablet' },
		{ key: 'mobile', type: 'Mobile' },
	];
	var STYLE_PROPS = [
		'display', 'position', 'visibility', 'opacity', 'overflow-x', 'overflow-y',
		'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
		'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration', 'white-space',
		'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
		'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
		'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
		'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
		'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-radius',
		'box-shadow', 'text-shadow', 'gap', 'column-gap', 'row-gap',
		'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'order',
		'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-area',
		'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio', 'object-fit', 'object-position',
		'z-index', 'transform', 'transform-origin', 'vertical-align', 'list-style-type',
	];

	function flatten(blocks) {
		var out = [];
		(blocks || []).forEach(function (block) {
			out.push(block);
			out = out.concat(flatten(block.innerBlocks || []));
		});
		return out;
	}

	function stripBlock(block) {
		return {
			name: block.name,
			attributes: block.attributes || {},
			innerBlocks: (block.innerBlocks || []).map(stripBlock),
		};
	}

	function stripBlocks(blocks) {
		return (blocks || []).map(stripBlock);
	}

	function canonical(value) {
		if (Array.isArray(value)) {
			return value.map(canonical);
		}
		if (value && typeof value === 'object') {
			return Object.keys(value).sort().reduce(function (out, key) {
				out[key] = canonical(value[key]);
				return out;
			}, {});
		}
		return value;
	}

	async function sha256(value) {
		var bytes = value instanceof Uint8Array
			? value
			: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(canonical(value)));
		var hash = await crypto.subtle.digest('SHA-256', bytes);
		return Array.from(new Uint8Array(hash), function (byte) {
			return byte.toString(16).padStart(2, '0');
		}).join('');
	}

	function newId() {
		var bytes = crypto.getRandomValues(new Uint8Array(12));
		return 'nd_' + Array.from(bytes, function (value) {
			return value.toString(36).padStart(2, '0');
		}).join('').slice(0, 24);
	}

	function simpleHash(text) {
		var hash = 2166136261;
		for (var index = 0; index < text.length; index += 1) {
			hash ^= text.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(36);
	}

	function safeUrlRef(value) {
		var raw = String(value || '');
		if (!raw) {
			return '';
		}
		if (/^data:/i.test(raw)) {
			return '[embedded-data-omitted]';
		}
		try {
			var url = new URL(raw, window.location.href);
			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				return raw;
			}
			return url.protocol + '//' + url.host + url.pathname;
		} catch (error) {
			return '';
		}
	}

	function safeCssValue(value) {
		var text = String(value || '');
		text = text.replace(/url\(\s*(["']?)data:[^)]+\1\s*\)/gi, 'url("[embedded-data-omitted]")');
		return text.replace(/url\(\s*(["']?)(https?:\/\/[^)"']+)\1\s*\)/gi, function (_match, _quote, url) {
			return 'url("' + safeUrlRef(url) + '")';
		});
	}

	function safeFileName(name, index) {
		var fallback = 'reference-' + (index + 1) + '.img';
		var clean = String(name || fallback)
			.replace(/[\x00-\x1f\x7f/\\]+/g, '_')
			.replace(/^\.+/, '')
			.slice(0, 120);
		return clean || fallback;
	}

	function sanitizePortableValue(value, keyName, depth) {
		depth = depth || 0;
		if (depth > 12) {
			return null;
		}
		var key = String(keyName || '').toLowerCase();
		if (/(?:api[_-]?key|password|passwd|secret|authorization|cookie|nonce|access[_-]?token|refresh[_-]?token)/.test(key)) {
			return '[redacted]';
		}
		if (typeof value === 'string') {
			if (/^data:/i.test(value)) {
				return '[embedded-data-omitted]';
			}
			if (/^https?:\/\//i.test(value)) {
				return safeUrlRef(value);
			}
			return value.toLowerCase().indexOf('url(') !== -1 ? safeCssValue(value) : value;
		}
		if (Array.isArray(value)) {
			return value.slice(0, 500).map(function (item) {
				return sanitizePortableValue(item, '', depth + 1);
			});
		}
		if (value && typeof value === 'object') {
			var out = {};
			Object.keys(value).slice(0, 500).forEach(function (childKey) {
				out[childKey] = sanitizePortableValue(value[childKey], childKey, depth + 1);
			});
			return out;
		}
		return value;
	}

	function waitLayout() {
		return new Promise(function (resolve) {
			requestAnimationFrame(function () {
				requestAnimationFrame(function () {
					setTimeout(resolve, 90);
				});
			});
		});
	}

	function ensureScopeIds(scope, kind) {
		var store = data.select('core/block-editor');
		var actions = data.dispatch('core/block-editor');
		var page = flatten(store.getBlocks() || []);
		var editable = kind === 'block' ? scope : flatten(scope);
		var editableClientIds = new Set(editable.map(function (block) { return block.clientId; }).filter(Boolean));
		var reserved = new Set();

		page.forEach(function (block) {
			if (editableClientIds.has(block.clientId)) {
				return;
			}
			var id = block.attributes && block.attributes.noderaId;
			if (typeof id === 'string' && ID_RE.test(id)) {
				reserved.add(id);
			}
		});

		editable.forEach(function (block) {
			if (!block.clientId) {
				return;
			}
			var id = block.attributes && block.attributes.noderaId;
			if (typeof id !== 'string' || !ID_RE.test(id) || reserved.has(id)) {
				do {
					id = newId();
				} while (reserved.has(id));
				actions.updateBlockAttributes(block.clientId, { noderaId: id });
			}
			reserved.add(id);
		});
	}

	function targetIds(scope, kind) {
		var editable = kind === 'block' ? scope : flatten(scope);
		return editable.map(function (block) {
			return block.attributes && block.attributes.noderaId;
		}).filter(function (id) {
			return typeof id === 'string' && ID_RE.test(id);
		});
	}

	async function fingerprint(scope) {
		return sha256(stripBlocks(scope));
	}

	function documents() {
		var out = [document];
		Array.from(document.querySelectorAll('iframe')).forEach(function (frame) {
			try {
				if (frame.contentDocument) {
					out.push(frame.contentDocument);
				}
			} catch (error) {
				// Cross-origin frames are intentionally ignored.
			}
		});
		return out;
	}

	function editorElement(clientId) {
		var docs = documents();
		for (var index = 0; index < docs.length; index += 1) {
			var doc = docs[index];
			var escape = (doc.defaultView && doc.defaultView.CSS && doc.defaultView.CSS.escape) || (window.CSS && window.CSS.escape);
			var safe = escape ? escape(clientId) : clientId.replace(/[^a-zA-Z0-9_-]/g, '');
			var node = doc.querySelector('[data-block="' + safe + '"]');
			if (node) {
				return node;
			}
		}
		return null;
	}

	function parsePx(value, fallback) {
		var number = parseFloat(String(value || ''));
		return Number.isFinite(number) ? number : fallback;
	}

	function parseRgb(value) {
		var match = String(value || '').match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*([\d.]+))?\s*\)/i);
		if (!match) {
			return null;
		}
		return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
	}

	function luminance(rgb) {
		function channel(value) {
			value /= 255;
			return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
		}
		return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
	}

	function contrastRatio(foreground, background) {
		var fg = parseRgb(foreground);
		var bg = parseRgb(background);
		if (!fg || !bg || fg[3] < 0.99 || bg[3] < 0.99) {
			return null;
		}
		var a = luminance(fg);
		var b = luminance(bg);
		return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
	}

	function presetRefs(value, out) {
		out = out || new Set();
		if (typeof value === 'string') {
			(value.match(/var:preset\|[a-z0-9_-]+\|[a-z0-9_-]+/gi) || []).forEach(function (item) { out.add(item); });
			return out;
		}
		if (Array.isArray(value)) {
			value.forEach(function (item) { presetRefs(item, out); });
			return out;
		}
		if (value && typeof value === 'object') {
			Object.keys(value).forEach(function (key) { presetRefs(value[key], out); });
		}
		return out;
	}

	function provenance(block) {
		var attrs = block.attributes || {};
		var className = String(attrs.className || '');
		var styleMatch = className.match(/is-style-[^\s]+/);
		return {
			styleAttribute: sanitizePortableValue(attrs.style || {}, 'style', 0),
			className: className,
			align: attrs.align || '',
			blockStyle: styleMatch ? styleMatch[0] : '',
			presetRefs: Array.from(presetRefs(attrs.style || {})).slice(0, 32),
		};
	}

	function semanticFacts(element) {
		var tag = element.tagName ? element.tagName.toLowerCase() : '';
		return {
			tag: tag,
			role: element.getAttribute ? (element.getAttribute('role') || '') : '',
			ariaLabel: element.getAttribute ? (element.getAttribute('aria-label') || '') : '',
			headingLevel: /^h[1-6]$/.test(tag) ? Number(tag.slice(1)) : null,
			links: element.querySelectorAll ? element.querySelectorAll('a[href]').length : 0,
			buttons: element.querySelectorAll ? element.querySelectorAll('button,[role="button"]').length : 0,
			images: element.querySelectorAll ? element.querySelectorAll('img').length : 0,
			inputs: element.querySelectorAll ? element.querySelectorAll('input,select,textarea').length : 0,
		};
	}

	function textFacts(element, style, rect) {
		var text = String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
		var fontSize = parsePx(style.fontSize, 16);
		var lineHeight = parsePx(style.lineHeight, fontSize * 1.2);
		return {
			characters: text.length,
			words: text ? text.split(/\s+/).length : 0,
			lineCount: lineHeight > 0 ? Math.max(0, Math.round(rect.height / lineHeight)) : 0,
			clipped: element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1,
			sample: text.slice(0, 180),
		};
	}

	function mediaFacts(element) {
		var image = element.matches && element.matches('img') ? element : (element.querySelector && element.querySelector('img'));
		if (image) {
			var imageStyle = (image.ownerDocument.defaultView || window).getComputedStyle(image);
			var naturalWidth = Number(image.naturalWidth || 0);
			var naturalHeight = Number(image.naturalHeight || 0);
			var imageRect = image.getBoundingClientRect();
			return {
				type: 'image',
				src: safeUrlRef(image.currentSrc || image.src || ''),
				alt: String(image.alt || ''),
				naturalWidth: naturalWidth,
				naturalHeight: naturalHeight,
				renderedWidth: imageRect.width,
				renderedHeight: imageRect.height,
				naturalAspectRatio: naturalHeight ? naturalWidth / naturalHeight : null,
				renderedAspectRatio: imageRect.height ? imageRect.width / imageRect.height : null,
				objectFit: imageStyle.objectFit,
				objectPosition: imageStyle.objectPosition,
			};
		}
		var video = element.querySelector && element.querySelector('video');
		if (video) {
			var videoRect = video.getBoundingClientRect();
			return {
				type: 'video',
				src: safeUrlRef(video.currentSrc || video.src || ''),
				naturalWidth: Number(video.videoWidth || 0),
				naturalHeight: Number(video.videoHeight || 0),
				renderedWidth: videoRect.width,
				renderedHeight: videoRect.height,
			};
		}
		return null;
	}

	function nodeKey(block, role) {
		var id = block.attributes && block.attributes.noderaId;
		if (typeof id === 'string' && ID_RE.test(id)) {
			return id;
		}
		return 'ctx_' + role + '_' + simpleHash(String(block.clientId || block.name || role));
	}

	function nodeFacts(block, role, editable) {
		if (!block.clientId) {
			return null;
		}
		var element = editorElement(block.clientId);
		if (!element) {
			return null;
		}
		var view = element.ownerDocument.defaultView || window;
		var rect = element.getBoundingClientRect();
		var style = view.getComputedStyle(element);
		var viewportWidth = view.innerWidth || element.ownerDocument.documentElement.clientWidth;
		var viewportHeight = view.innerHeight || element.ownerDocument.documentElement.clientHeight;
		var styles = {};
		STYLE_PROPS.forEach(function (property) {
			styles[property] = safeCssValue(style.getPropertyValue(property));
		});
		return {
			key: nodeKey(block, role),
			stableId: block.attributes && block.attributes.noderaId || null,
			clientRole: role,
			editable: editable,
			blockName: block.name,
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
			styles: styles,
			provenance: provenance(block),
			semantic: semanticFacts(element),
			text: textFacts(element, style, rect),
			media: mediaFacts(element),
			contrastRatio: contrastRatio(style.color, style.backgroundColor),
			scrollWidth: element.scrollWidth,
			scrollHeight: element.scrollHeight,
			clientWidth: element.clientWidth,
			clientHeight: element.clientHeight,
			horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
			verticalOverflow: element.scrollHeight > element.clientHeight + 1,
			zeroSize: rect.width <= 0 || rect.height <= 0,
			offscreen: rect.right < 0 || rect.bottom < 0 || rect.left > viewportWidth || rect.top > viewportHeight,
			clippedX: ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1,
			clippedY: ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1,
		};
	}

	function editorCanvasViewport() {
		var docs = documents();
		for (var index = 0; index < docs.length; index += 1) {
			if (docs[index] !== document && docs[index].querySelector('[data-block]')) {
				var view = docs[index].defaultView;
				return {
					width: view ? view.innerWidth : 0,
					height: view ? view.innerHeight : 0,
					devicePixelRatio: view ? view.devicePixelRatio : window.devicePixelRatio,
				};
			}
		}
		return { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio };
	}

	function captureViewport(scope, ancestors, siblings, kind) {
		var nodes = {};
		var editableSet = new Set(targetIds(scope, kind));
		flatten(scope).slice(0, 300).forEach(function (block) {
			var fact = nodeFacts(block, 'target', editableSet.has(block.attributes && block.attributes.noderaId));
			if (fact) {
				nodes[fact.key] = fact;
			}
		});
		(ancestors || []).slice(0, 12).forEach(function (block) {
			var fact = nodeFacts(block, 'ancestor', false);
			if (fact && !nodes[fact.key]) {
				nodes[fact.key] = fact;
			}
		});
		(siblings || []).slice(0, 12).forEach(function (block) {
			var fact = nodeFacts(block, 'sibling', false);
			if (fact && !nodes[fact.key]) {
				nodes[fact.key] = fact;
			}
		});
		return { measurementMode: 'native-gutenberg-device-preview', viewport: editorCanvasViewport(), nodes: nodes };
	}

	function graphIndex(blocks, parent, out) {
		out = out || {};
		(blocks || []).forEach(function (block, index) {
			var key = nodeKey(block, 'target');
			out[key] = {
				key: key,
				stableId: block.attributes && block.attributes.noderaId || null,
				blockName: block.name,
				parent: parent,
				children: (block.innerBlocks || []).map(function (child) { return nodeKey(child, 'target'); }),
				order: index,
			};
			graphIndex(block.innerBlocks || [], key, out);
		});
		return out;
	}

	function buildLayoutGraph(scope, viewports) {
		var graph = graphIndex(scope, null, {});
		Object.keys(graph).forEach(function (key) {
			graph[key].viewports = {};
			Object.keys(viewports).forEach(function (viewport) {
				var node = viewports[viewport].nodes[key];
				var parentKey = graph[key].parent;
				var parent = parentKey && viewports[viewport].nodes[parentKey];
				if (!node) {
					return;
				}
				var flow;
				if (node.styles.display === 'flex' || node.styles.display === 'inline-flex') {
					flow = { type: 'flex', direction: node.styles['flex-direction'], wrap: node.styles['flex-wrap'], justify: node.styles['justify-content'], align: node.styles['align-items'] };
				} else if (node.styles.display === 'grid' || node.styles.display === 'inline-grid') {
					flow = { type: 'grid', columns: node.styles['grid-template-columns'], rows: node.styles['grid-template-rows'], autoFlow: node.styles['grid-auto-flow'] };
				} else {
					flow = { type: node.styles.display || 'block' };
				}
				graph[key].viewports[viewport] = {
					rect: node.rect,
					widthRatioToParent: parent && parent.rect.width ? Number((node.rect.width / parent.rect.width).toFixed(4)) : null,
					heightRatioToParent: parent && parent.rect.height ? Number((node.rect.height / parent.rect.height).toFixed(4)) : null,
					flow: flow,
				};
			});
		});
		return { version: '1.0', nodes: graph };
	}

	function roleSummary(ancestors, siblings) {
		return {
			ancestors: (ancestors || []).slice(0, 12).map(function (block) { return { key: nodeKey(block, 'ancestor'), blockName: block.name, editable: false }; }),
			siblings: (siblings || []).slice(0, 12).map(function (block) { return { key: nodeKey(block, 'sibling'), blockName: block.name, editable: false }; }),
		};
	}

	function imageToDataUrl(blob) {
		return new Promise(function (resolve, reject) {
			var reader = new FileReader();
			reader.onload = function () { resolve(String(reader.result || '')); };
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	function sanitizeSnapshotAttributes(clone) {
		if (!clone || clone.nodeType !== 1 || !clone.getAttribute) {
			return;
		}
		['src', 'poster', 'href'].forEach(function (attribute) {
			if (clone.hasAttribute(attribute)) {
				var raw = clone.getAttribute(attribute) || '';
				if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw)) {
					clone.setAttribute(attribute, safeUrlRef(raw));
				}
			}
		});
		clone.removeAttribute('srcset');
		clone.removeAttribute('nonce');
		clone.removeAttribute('integrity');
	}

	function cloneComputed(source) {
		var clone = source.cloneNode(false);
		if (clone.nodeType !== 1) {
			return clone;
		}
		sanitizeSnapshotAttributes(clone);
		var style = (source.ownerDocument.defaultView || window).getComputedStyle(source);
		for (var index = 0; index < style.length; index += 1) {
			var property = style[index];
			try {
				clone.style.setProperty(property, safeCssValue(style.getPropertyValue(property)), style.getPropertyPriority(property));
			} catch (error) {
				// Unsupported style writes are ignored in the visual companion clone.
			}
		}
		clone.removeAttribute('contenteditable');
		clone.removeAttribute('spellcheck');
		Array.from(source.childNodes).forEach(function (child) {
			clone.appendChild(child.nodeType === 1 ? cloneComputed(child) : child.cloneNode(true));
		});
		var tag = String(source.tagName || '').toLowerCase();
		if ((tag === 'input' || tag === 'textarea') && 'value' in source && 'value' in clone) {
			clone.value = source.value;
		}
		return clone;
	}

	async function inlineImages(sourceRoot, cloneRoot) {
		var sources = sourceRoot.matches && sourceRoot.matches('img')
			? [sourceRoot].concat(Array.from(sourceRoot.querySelectorAll('img')))
			: Array.from(sourceRoot.querySelectorAll ? sourceRoot.querySelectorAll('img') : []);
		var clones = cloneRoot.matches && cloneRoot.matches('img')
			? [cloneRoot].concat(Array.from(cloneRoot.querySelectorAll('img')))
			: Array.from(cloneRoot.querySelectorAll ? cloneRoot.querySelectorAll('img') : []);
		await Promise.all(sources.map(async function (source, index) {
			var clone = clones[index];
			if (!clone) {
				return;
			}
			var src = String(source.currentSrc || source.src || '');
			if (!src) {
				return;
			}
			try {
				var url = new URL(src, window.location.href);
				if (url.origin !== window.location.origin) {
					clone.setAttribute('src', safeUrlRef(src));
					return;
				}
				var response = await fetch(url.href, { credentials: 'same-origin' });
				if (!response.ok) {
					clone.setAttribute('src', safeUrlRef(src));
					return;
				}
				clone.setAttribute('src', await imageToDataUrl(await response.blob()));
				clone.removeAttribute('srcset');
			} catch (error) {
				clone.setAttribute('src', safeUrlRef(src));
			}
		}));
	}

	async function svgToPng(svgBlob, width, height) {
		return new Promise(function (resolve) {
			var maxPixels = 12000000;
			var scale = Math.min(1, Math.sqrt(maxPixels / Math.max(1, width * height)));
			var canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(width * scale));
			canvas.height = Math.max(1, Math.round(height * scale));
			var context = canvas.getContext('2d');
			if (!context) {
				resolve(null);
				return;
			}
			var url = URL.createObjectURL(svgBlob);
			var image = new Image();
			image.onload = function () {
				try {
					context.drawImage(image, 0, 0, canvas.width, canvas.height);
					canvas.toBlob(function (blob) {
						URL.revokeObjectURL(url);
						resolve(blob);
					}, 'image/png', 0.92);
				} catch (error) {
					URL.revokeObjectURL(url);
					resolve(null);
				}
			};
			image.onerror = function () {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			image.src = url;
		});
	}

	async function snapshotTargets(scope, label) {
		var roots = (scope || []).map(function (block) {
			return block.clientId ? editorElement(block.clientId) : null;
		}).filter(Boolean);
		if (!roots.length) {
			return null;
		}
		var width = Math.max.apply(Math, roots.map(function (node) { return Math.ceil(node.getBoundingClientRect().width); }));
		var height = Math.min(16000, Math.max(1, Math.ceil(roots.reduce(function (total, node) {
			return total + node.getBoundingClientRect().height;
		}, 0))));
		if (!width || !height) {
			return null;
		}
		var wrapper = document.createElement('div');
		wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
		wrapper.style.width = width + 'px';
		wrapper.style.boxSizing = 'border-box';
		wrapper.style.background = 'white';
		for (var index = 0; index < roots.length; index += 1) {
			var clone = cloneComputed(roots[index]);
			await inlineImages(roots[index], clone);
			wrapper.appendChild(clone);
		}
		var markup = new XMLSerializer().serializeToString(wrapper);
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><foreignObject width="100%" height="100%">' + markup + '</foreignObject></svg>';
		var svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		var png = await svgToPng(svgBlob, width, height);
		if (png) {
			return { name: 'visual/' + label + '.png', blob: png, type: 'image/png', width: width, height: height, format: 'png' };
		}
		return { name: 'visual/' + label + '.svg', blob: svgBlob, type: 'image/svg+xml', width: width, height: height, format: 'svg' };
	}

	async function captureAcrossDevices(scope, ancestors, siblings, kind, withAssets) {
		var editorSelect = data.select('core/editor');
		var editorDispatch = data.dispatch('core/editor');
		if (!editorSelect || typeof editorSelect.getDeviceType !== 'function' || !editorDispatch || typeof editorDispatch.setDeviceType !== 'function') {
			throw new Error(__('This WordPress editor does not expose the native device preview API required by Nodera Visual AI.','nodera'));
		}
		var original = editorSelect.getDeviceType() || 'Desktop';
		var viewports = {};
		var assets = [];
		try {
			for (var index = 0; index < DEVICE_SPECS.length; index += 1) {
				var spec = DEVICE_SPECS[index];
				editorDispatch.setDeviceType(spec.type);
				await waitLayout();
				viewports[spec.key] = captureViewport(scope, ancestors, siblings, kind);
				if (withAssets) {
					var asset = await snapshotTargets(scope, spec.key);
					if (asset) {
						assets.push(asset);
					}
				}
			}
		} finally {
			editorDispatch.setDeviceType(original);
			await waitLayout();
		}
		var facts = {
			version: '2.0',
			capturePolicy: 'native-device-preview-same-origin-dom',
			viewports: viewports,
			layoutGraph: buildLayoutGraph(scope, viewports),
			contextRing: roleSummary(ancestors, siblings),
			limitations: {
				pseudoElementsCaptured: false,
				crossOriginMediaEmbedded: false,
				screenshots: 'best-effort PNG with credential-safe SVG fallback',
			},
		};
		facts.visualFingerprint = await sha256(facts);
		return { facts: facts, assets: assets };
	}

	function pickEditorDesign() {
		var store = data.select('core/block-editor');
		var settings = store && store.getSettings ? (store.getSettings() || {}) : {};
		var keys = ['colors', 'gradients', 'duotone', 'fontFamilies', 'fontSizes', 'spacingSizes', 'spacingUnits', 'layout', 'dimensions', 'shadow', 'typography', 'imageSizes'];
		var result = keys.reduce(function (out, key) {
			if (settings[key] !== undefined) {
				out[key] = settings[key];
			}
			return out;
		}, {});
		return sanitizePortableValue(result, 'editorDesign', 0);
	}

	async function designContext() {
		try {
			var result = await apiFetch({ path: '/nodera/v1/design-context' });
			return sanitizePortableValue(result, 'globalDesign', 0);
		} catch (error) {
			return { available: false, error: 'design-context-unavailable' };
		}
	}

	function imageDimensions(file) {
		return new Promise(function (resolve) {
			var url = URL.createObjectURL(file);
			var image = new Image();
			image.onload = function () {
				var result = { width: image.naturalWidth || 0, height: image.naturalHeight || 0 };
				URL.revokeObjectURL(url);
				resolve(result);
			};
			image.onerror = function () {
				URL.revokeObjectURL(url);
				resolve({ width: 0, height: 0 });
			};
			image.src = url;
		});
	}

	async function referenceMetadata(files) {
		var metas = [];
		for (var index = 0; index < files.length; index += 1) {
			var file = files[index];
			var dimensions = await imageDimensions(file);
			metas.push({
				name: safeFileName(file.name, index),
				type: file.type || 'application/octet-stream',
				size: file.size,
				sha256: await sha256(new Uint8Array(await file.arrayBuffer())),
				width: dimensions.width,
				height: dimensions.height,
				purpose: 'desired-visual-reference',
				editable: false,
			});
		}
		return metas;
	}

	function allBlockNames(scope) {
		return Array.from(new Set(flatten(scope).map(function (block) { return block.name; })));
	}

	async function currentScope(kind) {
		var store = data.select('core/block-editor');
		var all = store.getBlocks() || [];
		var selectedId = store.getSelectedBlockClientId && store.getSelectedBlockClientId();
		var selected = selectedId ? store.getBlock(selectedId) : null;
		if (kind !== 'page' && !selected) {
			throw new Error(__('Select a Gutenberg block first, or choose Whole page.','nodera'));
		}
		var target = kind === 'page' ? all : [selected];
		ensureScopeIds(target, kind);
		await waitLayout();

		all = store.getBlocks() || all;
		selected = selectedId ? store.getBlock(selectedId) : selected;
		var targetFresh = kind === 'page' ? all : [selected];
		var parentIds = selectedId && store.getBlockParents ? store.getBlockParents(selectedId) : [];
		var ancestors = parentIds.map(function (id) { return store.getBlock(id); }).filter(Boolean);
		var rootId = selectedId && store.getBlockRootClientId ? store.getBlockRootClientId(selectedId) : '';
		var siblings = selectedId && store.getBlocks
			? (store.getBlocks(rootId) || []).filter(function (block) { return block.clientId !== selectedId; })
			: [];
		return { blocks: all, target: targetFresh, kind: kind, ancestors: ancestors, siblings: siblings };
	}

	function modeFor(kind) {
		return kind === 'page' ? 'create' : (kind === 'block' ? 'edit' : 'redesign');
	}

	function policyInstructions(policy) {
		var rules = [];
		if (policy.preserveText) rules.push('Preserve existing text/content unless the task explicitly names text to change.');
		if (policy.preserveLinks) rules.push('Preserve existing URLs and link targets.');
		if (policy.preserveMedia) rules.push('Preserve existing media identity/crops unless the task explicitly changes media.');
		if (!policy.allowInsert) rules.push('Do not insert blocks.');
		if (!policy.allowRemove) rules.push('Do not remove blocks.');
		if (policy.designTokensOnly) rules.push('Prefer exported design tokens/presets; do not invent arbitrary design values when a matching token exists.');
		if (policy.avoidCustomCss) rules.push('Avoid Nodera custom CSS when native Gutenberg style/support attributes can express the result.');
		return rules;
	}

	async function prepareSession(kind, task, policy, files, withAssets, correctionIssues) {
		var scope = await currentScope(kind);
		var query = new URLSearchParams({ mode: 'full', task: task || '', blocks: allBlockNames(scope.target).join(',') });
		var references = await referenceMetadata(files);
		var parallel = await Promise.all([
			apiFetch({ path: '/nodera/v1/contracts?' + query.toString() }),
			designContext(),
		]);
		var visual = await captureAcrossDevices(scope.target, scope.ancestors, scope.siblings, kind, withAssets);
		var design = sanitizePortableValue({ editor: pickEditorDesign(), global: parallel[1] }, 'design', 0);
		var context = {
			schema: 'nodera-ai-context/v1',
			task: {
				request: task || '',
				mode: modeFor(kind),
				changePolicy: policy,
				policyRules: policyInstructions(policy),
				correctionIssues: correctionIssues || [],
			},
			target: {
				kind: kind,
				stableIds: targetIds(scope.target, kind),
				fingerprint: await fingerprint(scope.target),
			},
			document: {
				postType: String(data.select('core/editor').getCurrentPostType && data.select('core/editor').getCurrentPostType() || ''),
				title: String(data.select('core/editor').getEditedPostAttribute && data.select('core/editor').getEditedPostAttribute('title') || ''),
				scopeTree: stripBlocks(scope.target),
			},
			context: { ancestors: stripBlocks(scope.ancestors), siblings: stripBlocks(scope.siblings) },
			contracts: parallel[0],
			design: design,
			visualFacts: Object.assign({}, visual.facts, { references: references }),
			nativeWordPress: {
				devicePreview: 'core/editor.setDeviceType',
				responsiveStyleStates: ['@tablet', '@mobile'],
				pseudoStyleStates: {
					'core/button': [':hover', ':focus', ':focus-visible', ':active'],
					'core/navigation-link': [':hover', ':focus', ':focus-visible', ':active'],
				},
				preferredDesignBlocks: ['core/accordion', 'core/accordion-item', 'core/accordion-heading', 'core/accordion-panel', 'core/tabs', 'core/tab-list', 'core/tab-panels', 'core/tab-panel'],
			},
			environment: {
				wordpressVersion: window.NoderaSettings && window.NoderaSettings.wordpress,
				noderaVersion: window.NoderaSettings && window.NoderaSettings.version,
				theme: window.NoderaSettings && window.NoderaSettings.theme,
				designFingerprint: await sha256(design),
				visualFingerprint: visual.facts.visualFingerprint,
			},
			limits: { maxOperations: 200, maxPayloadBytes: 524288 },
			output: { schema: 'nodera-patch/v1' },
		};
		var postId = Number(data.select('core/editor').getCurrentPostId && data.select('core/editor').getCurrentPostId());
		var session = await apiFetch({
			path: '/nodera/v1/ai/export',
			method: 'POST',
			data: {
				postId: postId,
				context: context,
				currentBlocks: stripBlocks(scope.target),
				editableStableIds: targetIds(scope.target, kind),
			},
		});
		return { session: session, scope: scope, assets: visual.assets, references: references, files: files, policy: policy };
	}

	function promptFor(session, policy, assets, references) {
		var attached = (assets || []).map(function (asset) { return asset.name; }).concat((references || []).map(function (ref) { return 'references/' + ref.name; }));
		return [
			'You are editing a native WordPress 7.1+ Gutenberg document through Nodera Visual Fidelity 2.0.',
			'Gutenberg post_content is canonical. The bundle is temporary AI transport context only.',
			'Inspect session.json, visual measurements/layout graph, and every supplied visual attachment before designing.',
			'The Desktop/Tablet/Mobile measurements use Gutenberg core/editor.setDeviceType and the user preview is restored after capture.',
			'Treat files under references/ as desired visual references. Match composition, hierarchy, spacing, typography, color and responsive intent using only allowed Gutenberg contracts.',
			'Never target context-ring ancestors/siblings; they are read-only visual context. Edit only session.target.stableIds.',
		].concat(policyInstructions(policy)).concat([
			'Prefer native Gutenberg/Core blocks, Block Supports, Style Engine, Global Styles, Block Bindings and exported design tokens.',
			'For responsive styles use style.@tablet and style.@mobile. Avoid arbitrary CSS when native attributes are available.',
			'Return ONLY one nodera-patch/v1 JSON object. No Markdown, prose, HTML, Gutenberg comments or full-page replacement document.',
			'Every newly authored block must have a unique valid noderaId.',
			'Attachments in bundle: ' + (attached.length ? attached.join(', ') : 'none'),
			'',
			JSON.stringify(session, null, 2),
		]).join('\n');
	}

	function crcTable() {
		var table = new Uint32Array(256);
		for (var n = 0; n < 256; n += 1) {
			var current = n;
			for (var k = 0; k < 8; k += 1) {
				current = (current & 1) ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
			}
			table[n] = current >>> 0;
		}
		return table;
	}

	var CRC_TABLE = crcTable();
	function crc32(bytes) {
		var crc = 0xffffffff;
		for (var index = 0; index < bytes.length; index += 1) {
			crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
		}
		return (crc ^ 0xffffffff) >>> 0;
	}
	function u16(value) { return [value & 255, (value >>> 8) & 255]; }
	function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
	function dosDateTime(date) {
		date = date || new Date();
		return {
			time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
			date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
		};
	}
	function concatBytes(chunks) {
		var size = chunks.reduce(function (sum, chunk) { return sum + chunk.length; }, 0);
		var out = new Uint8Array(size);
		var offset = 0;
		chunks.forEach(function (chunk) {
			out.set(chunk, offset);
			offset += chunk.length;
		});
		return out;
	}
	async function entryBytes(entry) {
		if (entry.data instanceof Uint8Array) return entry.data;
		if (entry.data instanceof Blob) return new Uint8Array(await entry.data.arrayBuffer());
		return new TextEncoder().encode(String(entry.data || ''));
	}

	async function zipBlob(entries) {
		var locals = [];
		var centrals = [];
		var offset = 0;
		var stamp = dosDateTime(new Date());
		for (var index = 0; index < entries.length; index += 1) {
			var entry = entries[index];
			var name = new TextEncoder().encode(entry.name);
			var body = await entryBytes(entry);
			var crc = crc32(body);
			var local = new Uint8Array([0x50, 0x4b, 0x03, 0x04].concat(u16(20), u16(0x800), u16(0), u16(stamp.time), u16(stamp.date), u32(crc), u32(body.length), u32(body.length), u16(name.length), u16(0)));
			var central = new Uint8Array([0x50, 0x4b, 0x01, 0x02].concat(u16(20), u16(20), u16(0x800), u16(0), u16(stamp.time), u16(stamp.date), u32(crc), u32(body.length), u32(body.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)));
			locals.push(local, name, body);
			centrals.push(central, name);
			offset += local.length + name.length + body.length;
		}
		var centralBytes = concatBytes(centrals);
		var localBytes = concatBytes(locals);
		var end = new Uint8Array([0x50, 0x4b, 0x05, 0x06].concat(u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(localBytes.length), u16(0)));
		return new Blob([localBytes, centralBytes, end], { type: 'application/zip' });
	}

	function downloadBlob(filename, blob) {
		var url = URL.createObjectURL(blob);
		var anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
	}

	async function bundleEntries(prepared) {
		var prompt = promptFor(prepared.session, prepared.policy, prepared.assets, prepared.references);
		var entries = [
			{ name: 'session.json', data: JSON.stringify(prepared.session, null, 2) },
			{ name: 'prompt.txt', data: prompt },
			{ name: 'visual/manifest.json', data: JSON.stringify({ version: '2.0', visualFacts: prepared.session.context && prepared.session.context.visualFacts || {}, design: prepared.session.context && prepared.session.context.design || {}, changePolicy: prepared.policy }, null, 2) },
			{ name: 'references/manifest.json', data: JSON.stringify(prepared.references, null, 2) },
		];
		prepared.assets.forEach(function (asset) { entries.push({ name: asset.name, data: asset.blob }); });
		for (var index = 0; index < prepared.files.length; index += 1) {
			entries.push({ name: 'references/' + prepared.references[index].name, data: prepared.files[index] });
		}
		return { entries: entries, prompt: prompt };
	}

	function runQa(facts) {
		var issues = [];
		var viewports = facts && facts.viewports || {};
		Object.keys(viewports).forEach(function (viewport) {
			var nodes = viewports[viewport].nodes || {};
			Object.keys(nodes).forEach(function (key) {
				var node = nodes[key];
				if (!node.editable) return;
				function add(severity, code, message) {
					issues.push({ severity: severity, code: code, viewport: viewport, node: key, stableId: node.stableId || null, message: message });
				}
				if (node.horizontalOverflow) add('warning', 'horizontal-overflow', 'Rendered content overflows horizontally.');
				if (node.clippedX) add('warning', 'clipped-x', 'Content is horizontally clipped by overflow.');
				if (node.clippedY) add('warning', 'clipped-y', 'Content is vertically clipped by overflow.');
				if (node.zeroSize) add('error', 'zero-size', 'Rendered block has zero width or height.');
				if (viewport === 'mobile' && node.semantic && node.semantic.headingLevel && node.text && node.text.lineCount > 4) add('warning', 'heading-wrap', 'Heading wraps to more than four lines on mobile.');
				if (node.contrastRatio !== null && node.text && node.text.characters > 0 && node.contrastRatio < 4.5) add('warning', 'contrast', 'Measured text/background contrast is below 4.5:1.');
				if (node.media && node.media.type === 'image' && node.media.naturalAspectRatio && node.media.renderedAspectRatio && (!node.media.objectFit || node.media.objectFit === 'fill') && Math.abs(node.media.naturalAspectRatio - node.media.renderedAspectRatio) / node.media.naturalAspectRatio > 0.12) add('warning', 'image-distortion', 'Image rendered aspect ratio differs materially from its natural ratio.');
			});
		});
		return issues;
	}

	function VisualFidelitySidebar() {
		var selectedId = useSelect ? useSelect(function (select) {
			var store = select('core/block-editor');
			return store.getSelectedBlockClientId ? store.getSelectedBlockClientId() : null;
		}, []) : data.select('core/block-editor').getSelectedBlockClientId();
		var selected = Boolean(selectedId);
		var scopeState = useState(selected ? 'block' : 'page');
		var scope = scopeState[0];
		var setScope = scopeState[1];
		var taskState = useState('');
		var task = taskState[0];
		var setTask = taskState[1];
		var filesState = useState([]);
		var files = filesState[0];
		var setFiles = filesState[1];
		var busyState = useState(false);
		var busy = busyState[0];
		var setBusy = busyState[1];
		var noticeState = useState(null);
		var notice = noticeState[0];
		var setNotice = noticeState[1];
		var qaState = useState([]);
		var qa = qaState[0];
		var setQa = qaState[1];
		var policyState = useState({ preserveText: true, preserveLinks: true, preserveMedia: true, allowInsert: true, allowRemove: false, designTokensOnly: true, avoidCustomCss: true });
		var policy = policyState[0];
		var setPolicy = policyState[1];

		function updatePolicy(key, value) {
			var next = Object.assign({}, policy);
			next[key] = value;
			setPolicy(next);
		}

		function chooseFiles(event) {
			var chosen = Array.from(event.target.files || []).filter(function (file) { return String(file.type || '').startsWith('image/'); }).slice(0, 3);
			var total = chosen.reduce(function (sum, file) { return sum + file.size; }, 0);
			if (total > 12 * 1024 * 1024) {
				setNotice({ status: 'error', message: __('Reference images exceed the 12 MiB bundle limit.','nodera') });
				event.target.value = '';
				return;
			}
			setFiles(chosen);
			setNotice({ status: 'info', message: chosen.length ? __('Reference images will be bundled and described to the external AI.','nodera') : __('No reference images selected.','nodera') });
		}

		async function downloadBundle(correction) {
			setBusy(true);
			setNotice(null);
			try {
				var effectiveTask = correction ? (task || __('Fix the remaining visual QA issues while preserving the approved design and content.','nodera')) : task;
				var prepared = await prepareSession(scope, effectiveTask, policy, files, true, correction ? qa : []);
				var bundle = await bundleEntries(prepared);
				downloadBlob('nodera-' + prepared.session.sessionId + (correction ? '-correction' : '-visual') + '.zip', await zipBlob(bundle.entries));
				setNotice({ status: 'success', message: correction ? __('Correction bundle downloaded. Send it to the external AI and import the returned patch in Nodera AI.','nodera') : __('Multimodal AI bundle downloaded with session, Desktop/Tablet/Mobile visual captures, layout facts and references.','nodera') });
			} catch (error) {
				setNotice({ status: 'error', message: error instanceof Error ? error.message : String(error) });
			} finally {
				setBusy(false);
			}
		}

		async function copyPrompt() {
			setBusy(true);
			setNotice(null);
			try {
				var prepared = await prepareSession(scope, task, policy, files, false, []);
				await navigator.clipboard.writeText(promptFor(prepared.session, policy, [], prepared.references));
				setNotice({ status: 'success', message: __('Visual AI prompt copied. If you selected reference images, attach those image files separately to the external AI.','nodera') });
			} catch (error) {
				setNotice({ status: 'error', message: error instanceof Error ? error.message : String(error) });
			} finally {
				setBusy(false);
			}
		}

		async function captureQa() {
			setBusy(true);
			setNotice(null);
			try {
				var current = await currentScope(scope);
				var captured = await captureAcrossDevices(current.target, current.ancestors, current.siblings, scope, false);
				var issues = runQa(captured.facts);
				setQa(issues);
				setNotice({ status: issues.length ? 'warning' : 'success', message: issues.length ? __('Visual QA found issues. Review them or export a correction bundle.','nodera') : __('Visual QA found no deterministic layout issues in the three Gutenberg device previews.','nodera') });
			} catch (error) {
				setNotice({ status: 'error', message: error instanceof Error ? error.message : String(error) });
			} finally {
				setBusy(false);
			}
		}

		return h(PluginSidebar, { name: 'nodera-visual-fidelity', title: __('Nodera Visual AI','nodera'), icon: 'visibility' },
			h('div', { className: 'nodera-visual-fidelity-panel' },
				h(Notice, { status: 'info', isDismissible: false }, __('High-fidelity external AI workflow. Export measured Gutenberg Desktop/Tablet/Mobile views plus structure, contracts and design context. Import the returned nodera-patch/v1 through the standard Nodera AI panel.','nodera')),
				h(SelectControl, { label: __('Visual export scope','nodera'), value: scope, options: [
					{ label: __('Selected block only','nodera'), value: 'block', disabled: !selected },
					{ label: __('Selected subtree','nodera'), value: 'subtree', disabled: !selected },
					{ label: __('Whole page','nodera'), value: 'page' },
				], onChange: setScope }),
				h(TextareaControl, { label: __('Design task','nodera'), value: task, onChange: setTask, rows: 4, help: __('Describe the desired redesign or correction. The bundle also contains measured visual/layout facts.','nodera') }),
				h('fieldset', { className: 'nodera-visual-policy' },
					h('legend', null, __('Change policy','nodera')),
					h(CheckboxControl, { label: __('Preserve text/content','nodera'), checked: policy.preserveText, onChange: function (value) { updatePolicy('preserveText', value); } }),
					h(CheckboxControl, { label: __('Preserve links','nodera'), checked: policy.preserveLinks, onChange: function (value) { updatePolicy('preserveLinks', value); } }),
					h(CheckboxControl, { label: __('Preserve media','nodera'), checked: policy.preserveMedia, onChange: function (value) { updatePolicy('preserveMedia', value); } }),
					h(CheckboxControl, { label: __('Allow inserting blocks','nodera'), checked: policy.allowInsert, onChange: function (value) { updatePolicy('allowInsert', value); } }),
					h(CheckboxControl, { label: __('Allow removing blocks','nodera'), checked: policy.allowRemove, onChange: function (value) { updatePolicy('allowRemove', value); } }),
					h(CheckboxControl, { label: __('Prefer exported design tokens only','nodera'), checked: policy.designTokensOnly, onChange: function (value) { updatePolicy('designTokensOnly', value); } }),
					h(CheckboxControl, { label: __('Avoid Custom CSS','nodera'), checked: policy.avoidCustomCss, onChange: function (value) { updatePolicy('avoidCustomCss', value); } })
				),
				h('label', { className: 'nodera-visual-reference-input' }, h('span', null, __('Optional design reference images (max 3 / 12 MiB)','nodera')), h('input', { type: 'file', accept: 'image/*', multiple: true, onChange: chooseFiles })),
				files.length ? h('ul', { className: 'nodera-visual-reference-list' }, files.map(function (file, index) { return h('li', { key: index }, safeFileName(file.name, index) + ' · ' + Math.round(file.size / 1024) + ' KB'); })) : null,
				h('div', { className: 'nodera-actions' },
					h(Button, { variant: 'primary', disabled: busy, onClick: function () { downloadBundle(false); } }, busy ? h(Fragment, null, h(Spinner, null), ' ', __('Capturing…','nodera')) : __('Download Multimodal Bundle','nodera')),
					h(Button, { variant: 'secondary', disabled: busy, onClick: copyPrompt }, __('Copy Visual AI Prompt','nodera')),
					h(Button, { variant: 'tertiary', disabled: busy, onClick: captureQa }, __('Capture Visual QA','nodera'))
				),
				notice ? h('div', { className: 'nodera-visual-notice', 'aria-live': 'polite' }, h(Notice, { status: notice.status, isDismissible: false }, notice.message)) : null,
				qa.length ? h('div', { className: 'nodera-visual-qa' },
					h('h3', null, __('Visual QA issues','nodera')),
					h('ul', null, qa.map(function (issue, index) { return h('li', { key: index, 'data-severity': issue.severity }, h('strong', null, issue.viewport + ' · ' + issue.code), ': ' + issue.message); })),
					h(Button, { variant: 'secondary', disabled: busy, onClick: function () { downloadBundle(true); } }, __('Download Correction Bundle','nodera'))
				) : null
			)
		);
	}

	wp.plugins.registerPlugin('nodera-visual-fidelity', { render: VisualFidelitySidebar });
})(window.wp);
