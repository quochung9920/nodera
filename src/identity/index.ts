import { select, dispatch, subscribe } from '@wordpress/data';
import type { NoderaBlock } from '../types';

export const ID_RE = /^nd_[a-z0-9]{12,40}$/;

export function newStableId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	const token = Array.from(bytes, (value) => value.toString(36).padStart(2, '0')).join('').slice(0, 24);
	return `nd_${token}`;
}

export function flattenBlocks(blocks: NoderaBlock[]): NoderaBlock[] {
	const output: NoderaBlock[] = [];
	for (const block of blocks) {
		output.push(block);
		output.push(...flattenBlocks(block.innerBlocks || []));
	}
	return output;
}

export function stableIdToClientId(blocks: NoderaBlock[], stableId: string): string | undefined {
	return flattenBlocks(blocks).find((block) => block.attributes?.noderaId === stableId)?.clientId;
}

export function clientIdToStableId(blocks: NoderaBlock[], clientId: string): string | undefined {
	const value = flattenBlocks(blocks).find((block) => block.clientId === clientId)?.attributes?.noderaId;
	return typeof value === 'string' ? value : undefined;
}

export function reconcileIdentities(blocks: NoderaBlock[]): number {
	const seen = new Set<string>();
	let changed = 0;
	const editorDispatch = dispatch('core/block-editor') as unknown as {
		updateBlockAttributes: (clientId: string, attributes: Record<string, unknown>) => void;
	};
	for (const block of flattenBlocks(blocks)) {
		if (!block.clientId) continue;
		const id = block.attributes?.noderaId;
		if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id)) {
			editorDispatch.updateBlockAttributes(block.clientId, { noderaId: newStableId() });
			changed += 1;
		} else {
			seen.add(id);
		}
	}
	return changed;
}

let lastSignature = '';
let reconciling = false;

export function startIdentityReconciler(): () => void {
	const run = () => {
		if (reconciling) return;
		const store = select('core/block-editor') as unknown as { getBlocks: () => NoderaBlock[] };
		const blocks = store.getBlocks() || [];
		const signature = flattenBlocks(blocks)
			.map((block) => `${block.clientId}:${String(block.attributes?.noderaId || '')}`)
			.join('|');
		if (signature === lastSignature) return;
		lastSignature = signature;
		reconciling = true;
		try {
			reconcileIdentities(blocks);
		} finally {
			reconciling = false;
		}
	};
	run();
	return subscribe(run);
}
