import apiFetch from '@wordpress/api-fetch';
import type { NoderaBlock } from '../types';
import { stripBlocks, fingerprint } from './fingerprint';
import { captureVisualFacts } from './visual';
import { flattenBlocks } from '../identity';

export async function buildAiContext(args: {
	task: string;
	target: NoderaBlock[];
	ancestors: NoderaBlock[];
	siblings: NoderaBlock[];
	postType: string;
	postTitle: string;
	mode: 'edit' | 'create' | 'redesign';
	contractMode: 'focused' | 'expanded' | 'full';
	design: Record<string, unknown>;
}) {
	const stableIds = flattenBlocks(args.target)
		.map((block) => block.attributes?.noderaId)
		.filter((value): value is string => typeof value === 'string');
	const blockNames = flattenBlocks(args.target).map((block) => block.name);
	const query = new URLSearchParams({
		mode: args.contractMode,
		task: args.task,
		blocks: Array.from(new Set(blockNames)).join(','),
	});
	const contracts = await apiFetch<Record<string, unknown>>({ path: `/nodera/v1/contracts?${query.toString()}` });
	const targetFingerprint = await fingerprint(args.target);
	return {
		schema: 'nodera-ai-context/v1',
		task: { request: args.task, mode: args.mode },
		target: {
			kind: args.target.length === 1 ? 'subtree' : 'page',
			stableIds,
			fingerprint: targetFingerprint,
		},
		document: {
			postType: args.postType,
			title: args.postTitle,
			scopeTree: stripBlocks(args.target),
		},
		context: {
			ancestors: stripBlocks(args.ancestors),
			siblings: stripBlocks(args.siblings),
		},
		contracts,
		design: args.design,
		visualFacts: { browser: captureVisualFacts(args.target) },
		environment: {
			wordpressVersion: window.NoderaSettings?.wordpress,
			noderaVersion: window.NoderaSettings?.version,
			nativeResponsive: window.NoderaSettings?.nativeResponsive,
			nativeStyleStates: window.NoderaSettings?.nativeStyleStates,
			breakpoints: window.NoderaSettings?.breakpoints,
			provider: window.NoderaSettings?.provider?.provider,
		},
		limits: { maxOperations: 200, maxPayloadBytes: 524288 },
		output: { schema: 'nodera-patch/v1' },
	};
}

export function oneShotPrompt(context: Record<string, unknown>): string {
	return [
		'You are editing a native WordPress Gutenberg document through Nodera.',
		'Use only full authorable block contracts included in the context. catalogIndex is discovery only.',
		'Do not invent block names or attributes. Do not edit outside the exact target scope.',
		'Return ONLY one nodera-patch/v1 JSON object. No Markdown, HTML, Gutenberg comment markup, or explanation.',
		'Every newly authored block must include a unique valid noderaId.',
		'Prefer WordPress Core blocks and registered Block Supports over Custom CSS.',
		'On WordPress 7.1+, prefer native responsive style states in style.@tablet/style.@mobile and native pseudo states for supported blocks.',
		'Prefer Core Accordion/Core Tabs families over legacy nodera/accordion or nodera/tabs.',
		'Prefer native Block Bindings declarations for dynamic data. Never invent binding sources.',
		'If the user supplied a reference image in this AI conversation, use it as visual guidance while respecting Nodera contracts and measured visual facts.',
		'',
		JSON.stringify(context, null, 2),
	].join('\n');
}
