import type { NoderaBlock } from '../types';

function strip(block: NoderaBlock): Record<string, unknown> {
	return {
		name: block.name,
		attributes: block.attributes || {},
		innerBlocks: (block.innerBlocks || []).map(strip),
	};
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === 'object') {
		const input = value as Record<string, unknown>;
		return Object.keys(input)
			.sort()
			.reduce<Record<string, unknown>>((output, key) => {
				output[key] = canonicalize(input[key]);
				return output;
			}, {});
	}
	return value;
}

export function stripBlocks(blocks: NoderaBlock[]): NoderaBlock[] {
	return blocks.map((block) => strip(block) as unknown as NoderaBlock);
}

export async function fingerprint(blocks: NoderaBlock[]): Promise<string> {
	const encoded = new TextEncoder().encode(JSON.stringify(canonicalize(stripBlocks(blocks))));
	const hash = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
