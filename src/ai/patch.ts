import { createBlock } from '@wordpress/blocks';
import { dispatch, select } from '@wordpress/data';
import type { NoderaBlock, NoderaPatch } from '../types';
import { newStableId, stableIdToClientId } from '../identity';

export function materialize(spec: NoderaBlock): unknown {
	const attributes = { ...(spec.attributes || {}) };
	if (!attributes.noderaId) attributes.noderaId = newStableId();
	return createBlock(spec.name, attributes, (spec.innerBlocks || []).map(materialize));
}

export function applyPatch(patch: NoderaPatch, blocks: NoderaBlock[]): void {
	const actions = dispatch('core/block-editor') as unknown as {
		updateBlockAttributes: (id: string, attrs: Record<string, unknown>) => void;
		insertBlocks: (blocks: unknown, index?: number, rootClientId?: string) => void;
		removeBlocks: (ids: string[]) => void;
		replaceBlocks: (ids: string | string[], blocks: unknown) => void;
		replaceInnerBlocks: (rootId: string, blocks: unknown[], updateSelection?: boolean) => void;
		moveBlocksToPosition: (ids: string[], sourceRoot: string, targetRoot: string, index: number) => void;
	};
	const selectors = select('core/block-editor') as unknown as {
		getBlockRootClientId: (id: string) => string;
	};
	for (const operation of patch.operations) {
		const id = operation.stableId ? stableIdToClientId(blocks, operation.stableId) : undefined;
		if (operation.op === 'updateAttributes' && id) {
			actions.updateBlockAttributes(id, operation.attributes || {});
		} else if (operation.op === 'removeBlock' && id) {
			actions.removeBlocks([id]);
		} else if (operation.op === 'replaceBlock' && id && operation.block) {
			actions.replaceBlocks(id, materialize(operation.block));
		} else if (operation.op === 'replaceInnerBlocks' && id && operation.blocks) {
			actions.replaceInnerBlocks(id, operation.blocks.map(materialize), false);
		} else if (operation.op === 'insertBlock' && operation.block) {
			const parent = operation.parentStableId ? stableIdToClientId(blocks, operation.parentStableId) : undefined;
			actions.insertBlocks(materialize(operation.block), operation.index, parent);
		} else if (operation.op === 'moveBlock' && id) {
			const target = operation.toParentStableId ? stableIdToClientId(blocks, operation.toParentStableId) : '';
			const source = selectors.getBlockRootClientId(id) || '';
			actions.moveBlocksToPosition([id], source, target || '', operation.index || 0);
		}
	}
}
