import apiFetch from '@wordpress/api-fetch';
import type { NoderaAiExport, NoderaBlock, NoderaTargetKind } from '../types';
import { stripBlocks, fingerprint } from './fingerprint';
import { captureVisualFacts } from './visual';
import { flattenBlocks } from '../identity';

export async function buildAiContext(args: {
	task: string;
	target: NoderaBlock[];
	targetKind: NoderaTargetKind;
	ancestors: NoderaBlock[];
	siblings: NoderaBlock[];
	postType: string;
	postTitle: string;
	mode: 'edit' | 'create' | 'redesign';
	contractMode: 'focused' | 'expanded' | 'full';
	design: Record<string, unknown>;
}) {
	const editableBlocks = args.targetKind === 'block' ? args.target : flattenBlocks(args.target);
	const stableIds = editableBlocks.map((block) => block.attributes?.noderaId).filter((value): value is string => typeof value === 'string');
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

export function portableAiPrompt(session: NoderaAiExport): string {
	return [
		'You are editing a native WordPress 7.1+ Gutenberg document through Nodera.',
		`Portable session: ${session.sessionId}.`,
		'Read the attached nodera-ai-export/v1 package as temporary AI context only; Gutenberg post_content remains canonical.',
		'Use only the full block contracts included in session.context. catalogIndex is discovery only.',
		'Edit only target.stableIds and obey target.kind. Never escape the exported scope.',
		'For target.kind=block, only update, replace, or remove that block; do not restructure descendants.',
		'Do not invent attributes. Prefer native Core Gutenberg blocks, Block Supports, Global Styles, Block Bindings and the Style Engine.',
		'For responsive styles use native style.@tablet and style.@mobile. For supported Button/Navigation Link pseudo states use style.:hover, style.:focus, style.:focus-visible and style.:active.',
		'Use core/accordion and core/tabs families instead of legacy nodera/accordion or nodera/tabs.',
		'Return ONLY one nodera-patch/v1 JSON object. No Markdown, HTML, Gutenberg comment markup, prose, or a full replacement page document.',
		'Every newly authored block must include a unique valid noderaId.',
		'',
		JSON.stringify(session, null, 2),
	].join('\n');
}

/** Backward-compatible raw-context prompt helper. Portable sessions should use portableAiPrompt(). */
export function oneShotPrompt(context: Record<string, unknown>): string {
	return [
		'You are editing a native WordPress 7.1+ Gutenberg document through Nodera.',
		'Return ONLY one nodera-patch/v1 JSON object. Do not escape the editable target.',
		'Prefer native Gutenberg/Core blocks and style states. Do not return a full replacement page document.',
		'',
		JSON.stringify(context, null, 2),
	].join('\n');
}
