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

function editorStore() {
	return select('core/block-editor') as unknown as {
		getBlocks: () => NoderaBlock[];
		getBlock: (clientId: string) => NoderaBlock | null;
	};
}

function editorActions() {
	return dispatch('core/block-editor') as unknown as {
		updateBlockAttributes: (clientId: string, attributes: Record<string, unknown>) => void;
	};
}

/**
 * Lazily assign IDs only to the scope Nodera is about to operate on.
 * Opening a legacy page no longer dirties every block just because Nodera is active.
 */
export function ensureIdentities(blocks: NoderaBlock[]): number {
	const scope = new Set(flattenBlocks(blocks).map((block) => block.clientId).filter(Boolean) as string[]);
	const used = new Set<string>();
	for (const block of flattenBlocks(editorStore().getBlocks() || [])) {
		if (scope.has(String(block.clientId || ''))) continue;
		const id = block.attributes?.noderaId;
		if (typeof id === 'string' && ID_RE.test(id)) used.add(id);
	}

	let changed = 0;
	for (const block of flattenBlocks(blocks)) {
		if (!block.clientId) continue;
		const id = block.attributes?.noderaId;
		if (typeof id === 'string' && ID_RE.test(id) && !used.has(id)) {
			used.add(id);
			continue;
		}
		let next = newStableId();
		while (used.has(next)) next = newStableId();
		used.add(next);
		editorActions().updateBlockAttributes(block.clientId, { noderaId: next });
		changed += 1;
	}
	return changed;
}

/**
 * Reconcile duplicate/corrupt IDs that already exist, but deliberately leave missing IDs alone.
 */
export function reconcileExistingIdentities(blocks: NoderaBlock[]): number {
	const seen = new Set<string>();
	let changed = 0;
	for (const block of flattenBlocks(blocks)) {
		if (!block.clientId) continue;
		const id = block.attributes?.noderaId;
		if (id === undefined || id === null || id === '') continue;
		if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id)) {
			let next = newStableId();
			while (seen.has(next)) next = newStableId();
			editorActions().updateBlockAttributes(block.clientId, { noderaId: next });
			seen.add(next);
			changed += 1;
		} else {
			seen.add(id);
		}
	}
	return changed;
}

export function freshBlocks(clientIds: string[]): NoderaBlock[] {
	return clientIds.map((clientId) => editorStore().getBlock(clientId)).filter(Boolean) as NoderaBlock[];
}

let lastSignature = '';
let reconciling = false;

export function startIdentityReconciler(): () => void {
	const run = () => {
		if (reconciling) return;
		const blocks = editorStore().getBlocks() || [];
		const existing = flattenBlocks(blocks).filter((block) => block.attributes?.noderaId);
		const signature = existing.map((block) => `${block.clientId}:${String(block.attributes?.noderaId || '')}`).join('|');
		if (signature === lastSignature) return;
		lastSignature = signature;
		reconciling = true;
		try {
			reconcileExistingIdentities(blocks);
		} finally {
			reconciling = false;
		}
	};
	run();
	return subscribe(run);
}
