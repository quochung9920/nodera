import type { NoderaBlock } from '../types';
import { flattenBlocks } from '../identity';

function documents(): Document[] {
	const output: Document[] = [document];
	for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
		try {
			if (iframe.contentDocument) output.push(iframe.contentDocument);
		} catch {
			// Cross-origin frames are intentionally ignored.
		}
	}
	return output;
}

function editorElement(clientId: string): HTMLElement | null {
	for (const doc of documents()) {
		const escaped = window.CSS?.escape ? CSS.escape(clientId) : clientId.replace(/[^a-zA-Z0-9_-]/g, '');
		const byClient = doc.querySelector(`[data-block="${escaped}"]`) as HTMLElement | null;
		if (byClient) return byClient;
	}
	return null;
}

export function captureVisualFacts(blocks: NoderaBlock[]) {
	const nodes: Record<string, unknown> = {};
	let measuredViewport: { width: number; height: number; devicePixelRatio: number } | null = null;
	for (const block of flattenBlocks(blocks)) {
		const stableId = block.attributes?.noderaId;
		if (!block.clientId || typeof stableId !== 'string') continue;
		const element = editorElement(block.clientId);
		if (!element) continue;
		const view = element.ownerDocument.defaultView || window;
		const rect = element.getBoundingClientRect();
		const style = view.getComputedStyle(element);
		const viewport = {
			width: view.innerWidth,
			height: view.innerHeight,
			devicePixelRatio: view.devicePixelRatio,
		};
		measuredViewport ||= viewport;
		nodes[stableId] = {
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
			viewport,
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
			horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
		};
	}
	return {
		measuredGeometry: Object.keys(nodes).length > 0,
		captureStatus: Object.keys(nodes).length > 0 ? 'ok' : 'unavailable',
		viewport: measuredViewport || {
			width: window.innerWidth,
			height: window.innerHeight,
			devicePixelRatio: window.devicePixelRatio,
		},
		viewportSource: measuredViewport ? 'editor-canvas' : 'admin-window',
		nodes,
	};
}
