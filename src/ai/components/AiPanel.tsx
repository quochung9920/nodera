import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, SelectControl, Spinner, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import type { NoderaBlock, NoderaPatch, ValidationResponse } from '../../types';
import { flattenBlocks } from '../../identity';
import { buildAiContext, oneShotPrompt } from '../context';
import { stripBlocks, fingerprint } from '../fingerprint';
import { normalizeAiResult } from '../normalizer';
import { applyPatch } from '../patch';
import { Review } from './Review';

type DirectGenerationResponse = ValidationResponse & { patch: NoderaPatch };

export function AiPanel(props: {
	blocks: NoderaBlock[];
	target: NoderaBlock[];
	ancestors: NoderaBlock[];
	siblings: NoderaBlock[];
	postId: number;
	postType: string;
	postTitle: string;
	design: Record<string, unknown>;
}) {
	const [task, setTask] = useState('');
	const [result, setResult] = useState('');
	const [contractMode, setContractMode] = useState<'focused' | 'expanded' | 'full'>('expanded');
	const [exported, setExported] = useState<Record<string, unknown> | null>(null);
	const [patch, setPatch] = useState<NoderaPatch | null>(null);
	const [validated, setValidated] = useState<ValidationResponse | null>(null);
	const [generating, setGenerating] = useState(false);
	const [notice, setNotice] = useState<{ status: 'success' | 'error' | 'warning'; message: string } | null>(null);
	const targetIds = useMemo(() => flattenBlocks(props.target).map((block) => block.attributes?.noderaId).filter((id): id is string => typeof id === 'string'), [props.target]);

	async function prepareContext() {
		const context = await buildAiContext({
			task,
			target: props.target,
			ancestors: props.ancestors,
			siblings: props.siblings,
			postType: props.postType,
			postTitle: props.postTitle,
			mode: props.target.length === props.blocks.length ? 'create' : 'redesign',
			contractMode,
			design: props.design,
		});
		setExported(context);
		return context;
	}

	async function generateDirect() {
		if (!task.trim()) return;
		setGenerating(true);
		setNotice(null);
		setPatch(null);
		setValidated(null);
		try {
			const context = await prepareContext();
			const response = await apiFetch<DirectGenerationResponse>({
				path: '/nodera/v1/ai/generate',
				method: 'POST',
				data: {
					postId: props.postId,
					context,
					currentBlocks: stripBlocks(props.target),
					editableStableIds: targetIds,
					visualFacts: context.visualFacts || {},
				},
			});
			setPatch(response.patch);
			setValidated(response);
			setNotice({ status: 'success', message: __('AI generated a validated Gutenberg patch. Review it below, then Apply locally.', 'nodera') });
		} catch (error) {
			setNotice({
				status: 'warning',
				message: error instanceof Error ? error.message : __('Direct AI generation is not available. Configure a Nodera provider bridge or use Manual external AI below.', 'nodera'),
			});
		} finally {
			setGenerating(false);
		}
	}

	async function exportContext() {
		try {
			const context = await prepareContext();
			await navigator.clipboard.writeText(oneShotPrompt(context));
			setNotice({ status: 'success', message: __('AI prompt and context copied. Attach a reference image in your AI chat when needed.', 'nodera') });
		} catch (error) {
			setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Could not export AI context.', 'nodera') });
		}
	}

	async function copyContext() {
		if (!exported) return;
		await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
		setNotice({ status: 'success', message: __('Context JSON copied.', 'nodera') });
	}

	function downloadBundle() {
		if (!exported) return;
		const bundle = { schema: 'nodera-ai-bundle/v1', context: exported, prompt: oneShotPrompt(exported) };
		const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'nodera-ai-bundle.json';
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function validate() {
		try {
			const parsed = normalizeAiResult(result);
			const response = await apiFetch<ValidationResponse>({
				path: '/nodera/v1/ai/validate',
				method: 'POST',
				data: {
					postId: props.postId,
					currentBlocks: stripBlocks(props.target),
					editableStableIds: targetIds,
					visualFacts: exported?.visualFacts || {},
					patch: parsed,
				},
			});
			setPatch(parsed);
			setValidated(response);
			setNotice(null);
		} catch (error) {
			setPatch(null);
			setValidated(null);
			setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Validation failed.', 'nodera') });
		}
	}

	async function apply() {
		if (!patch || !validated) return;
		const currentFingerprint = await fingerprint(props.target);
		if (currentFingerprint !== patch.target.fingerprint) {
			setNotice({ status: 'error', message: __('Target changed after validation. Generate/export and validate again.', 'nodera') });
			return;
		}
		applyPatch(patch, props.blocks);
		setNotice({ status: 'success', message: __('Changes applied locally to Gutenberg. Use native Undo to revert, or Save/Update to persist.', 'nodera') });
	}

	async function copyRepairPrompt() {
		if (!notice || notice.status !== 'error' || !exported) return;
		const prompt = [
			'Correct the Nodera patch validation problem below.',
			`Error: ${notice.message}`,
			'Do not change the target. Return nodera-patch/v1 JSON only.',
			`Original task: ${task}`,
			`Target: ${JSON.stringify(exported.target)}`,
		].join('\n');
		await navigator.clipboard.writeText(prompt);
	}

	return (
		<div className="nodera-panel">
			<p className="nodera-target"><strong>{__('Target', 'nodera')}:</strong> {props.target.length === props.blocks.length ? __('Whole page', 'nodera') : __('Selected Gutenberg subtree', 'nodera')}</p>
			<TextareaControl label={__('What should Nodera change?', 'nodera')} value={task} onChange={setTask} rows={4} />
			<SelectControl label={__('AI contract scope', 'nodera')} value={contractMode} options={[
				{ label: __('Focused', 'nodera'), value: 'focused' },
				{ label: __('Expanded', 'nodera'), value: 'expanded' },
				{ label: __('Full', 'nodera'), value: 'full' },
			]} onChange={(value) => setContractMode(value as typeof contractMode)} />
			<Button variant="primary" onClick={generateDirect} disabled={!task.trim() || generating}>
				{generating ? <><Spinner /> {__('Generating…', 'nodera')}</> : __('Generate in Gutenberg', 'nodera')}
			</Button>
			{notice && <Notice status={notice.status} isDismissible={false}>{notice.message}</Notice>}
			{validated && <Review response={validated} />}
			{validated && patch && <Button variant="primary" onClick={apply}>{__('Apply to Gutenberg', 'nodera')}</Button>}

			<details className="nodera-manual-ai">
				<summary>{__('Manual external AI fallback', 'nodera')}</summary>
				<p>{__('Use this only when no direct Nodera AI provider bridge is configured.', 'nodera')}</p>
				<div className="nodera-actions">
					<Button variant="secondary" onClick={exportContext} disabled={!task.trim()}>{__('Copy for external AI', 'nodera')}</Button>
					<Button variant="tertiary" onClick={copyContext} disabled={!exported}>{__('Copy context', 'nodera')}</Button>
					<Button variant="tertiary" onClick={downloadBundle} disabled={!exported}>{__('Download bundle', 'nodera')}</Button>
				</div>
				<TextareaControl label={__('Paste nodera-patch/v1 result', 'nodera')} value={result} onChange={setResult} rows={9} />
				<Button variant="secondary" onClick={validate} disabled={!result.trim()}>{__('Validate & Preview', 'nodera')}</Button>
			</details>
			{notice?.status === 'error' && exported && <Button variant="tertiary" onClick={copyRepairPrompt}>{__('Copy Repair Prompt', 'nodera')}</Button>}
		</div>
	);
}
