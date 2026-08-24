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
		const escape = doc.defaultView?.CSS?.escape || window.CSS?.escape;
		const safe = escape ? escape(clientId) : clientId.replace(/[^a-zA-Z0-9_-]/g, '');
		const byClient = doc.querySelector(`[data-block="${safe}"]`) as HTMLElement | null;
		if (byClient) return byClient;
	}
	return null;
}

export function captureVisualFacts(blocks: NoderaBlock[]) {
	const nodes: Record<string, unknown> = {};
	for (const block of flattenBlocks(blocks)) {
		const stableId = block.attributes?.noderaId;
		if (!block.clientId || typeof stableId !== 'string') continue;
		const element = editorElement(block.clientId);
		if (!element) continue;
		const view = element.ownerDocument.defaultView || window;
		const rect = element.getBoundingClientRect();
		const style = view.getComputedStyle(element);
		const viewportWidth = view.innerWidth || element.ownerDocument.documentElement.clientWidth;
		const viewportHeight = view.innerHeight || element.ownerDocument.documentElement.clientHeight;
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
			horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
			zeroSize: rect.width <= 0 || rect.height <= 0,
			offscreen: rect.right < 0 || rect.bottom < 0 || rect.left > viewportWidth || rect.top > viewportHeight,
			clippedX: ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1,
			clippedY: ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1,
		};
	}
	return {
		measuredGeometry: Object.keys(nodes).length > 0,
		captureStatus: Object.keys(nodes).length > 0 ? 'ok' : 'unavailable',
		viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
		nodes,
	};
}
