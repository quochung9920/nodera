import apiFetch from '@wordpress/api-fetch';
import type { NoderaBlock } from '../types';
import { stripBlocks, fingerprint } from './fingerprint';
import { captureVisualFacts } from './visual';
import { flattenBlocks } from '../identity';

export async function buildAiContext(args: {
	task: string;
	target: NoderaBlock[];
	targetKind: 'subtree' | 'page';
	ancestors: NoderaBlock[];
	siblings: NoderaBlock[];
	postType: string;
	postTitle: string;
	mode: 'edit' | 'create' | 'redesign';
	contractMode: 'focused' | 'expanded' | 'full';
	design: Record<string, unknown>;
}) {
	const stableIds = flattenBlocks(args.target).map((block) => block.attributes?.noderaId).filter((value): value is string => typeof value === 'string');
	const blockNames = flattenBlocks(args.target).map((block) => block.name);
	const query = new URLSearchParams({ mode: args.contractMode, task: args.task, blocks: Array.from(new Set(blockNames)).join(',') });
	const contracts = await apiFetch<Record<string, unknown>>({ path: `/nodera/v1/contracts?${query.toString()}` });
	return {
		schema: 'nodera-ai-context/v1',
		task: { request: args.task, mode: args.mode },
		target: { kind: args.targetKind, stableIds, fingerprint: await fingerprint(args.target) },
		document: { postType: args.postType, title: args.postTitle, scopeTree: stripBlocks(args.target) },
		context: { ancestors: stripBlocks(args.ancestors), siblings: stripBlocks(args.siblings) },
		contracts,
		design: args.design,
		visualFacts: { browser: captureVisualFacts(args.target) },
		nativeWordPress: {
			responsiveStyleStates: ['@tablet', '@mobile'],
			pseudoStyleStates: { 'core/button': [':hover', ':focus', ':focus-visible', ':active'], 'core/navigation-link': [':hover', ':focus', ':focus-visible', ':active'] },
			preferredDesignBlocks: ['core/accordion', 'core/accordion-item', 'core/accordion-heading', 'core/accordion-panel', 'core/tabs', 'core/tab-list', 'core/tab-panels', 'core/tab-panel'],
		},
		environment: { wordpressVersion: window.NoderaSettings?.wordpress, noderaVersion: window.NoderaSettings?.version },
		limits: { maxOperations: 200, maxPayloadBytes: 524288 },
		output: { schema: 'nodera-patch/v1' },
	};
}

export function oneShotPrompt(context: Record<string, unknown>): string {
	return [
		'You are editing a native WordPress 7.1+ Gutenberg document through Nodera.',
		'Use only full block contracts included in the context. catalogIndex is discovery only.',
		'Do not invent attributes. Do not edit outside the editable target.',
		'Return ONLY one nodera-patch/v1 JSON object. No Markdown, HTML, Gutenberg comment markup, or explanation.',
		'Every newly authored block must include a unique valid noderaId.',
		'Prefer Core Gutenberg blocks, Block Supports, Global Styles, Block Bindings and the Style Engine over Nodera-specific data or Custom CSS.',
		'For responsive styles use native style.@tablet and style.@mobile. For supported Button/Navigation Link pseudo states use style.:hover, style.:focus, style.:focus-visible and style.:active.',
		'Use core/accordion and core/tabs families instead of legacy nodera/accordion or nodera/tabs.',
		'If the user supplied a reference image, use it as visual guidance while respecting contracts and scope.',
		'', JSON.stringify(context, null, 2),
	].join('\n');
}
