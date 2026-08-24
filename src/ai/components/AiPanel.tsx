import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, SelectControl, Spinner, TextareaControl } from '@wordpress/components';
import { select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { NoderaBlock, NoderaPatch, ValidationResponse } from '../../types';
import { ensureIdentities, flattenBlocks } from '../../identity';
import { buildAiContext, oneShotPrompt } from '../context';
import { stripBlocks, fingerprint } from '../fingerprint';
import { normalizeAiResult } from '../normalizer';
import { applyPatch } from '../patch';
import { Review } from './Review';

type DirectGenerationResponse = ValidationResponse & { patch: NoderaPatch };

type Scope = { blocks: NoderaBlock[]; target: NoderaBlock[] };

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
	const [exported, setExported] = useState<Record<string, any> | null>(null);
	const [patch, setPatch] = useState<NoderaPatch | null>(null);
	const [validated, setValidated] = useState<ValidationResponse | null>(null);
	const [generating, setGenerating] = useState(false);
	const [notice, setNotice] = useState<{ status: 'success' | 'error' | 'warning'; message: string } | null>(null);
	const provider = window.NoderaSettings?.aiProvider;

	async function currentScope(): Promise<Scope> {
		ensureIdentities(props.target);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		const store = select('core/block-editor') as any;
		const blocks = (store.getBlocks?.() || props.blocks) as NoderaBlock[];
		const wholePage = props.target.length === props.blocks.length;
		const target = wholePage
			? blocks
			: props.target.map((item) => item.clientId ? store.getBlock(item.clientId) : item).filter(Boolean) as NoderaBlock[];
		return { blocks, target };
	}

	function targetIds(scope: NoderaBlock[]) {
		return flattenBlocks(scope).map((block) => block.attributes?.noderaId).filter((id): id is string => typeof id === 'string');
	}

	async function prepareContext() {
		const scope = await currentScope();
		const context = await buildAiContext({
			task,
			target: scope.target,
			ancestors: props.ancestors,
			siblings: props.siblings,
			postType: props.postType,
			postTitle: props.postTitle,
			mode: scope.target.length === scope.blocks.length ? 'create' : 'redesign',
			contractMode,
			design: props.design,
		});
		setExported(context);
		return { context, scope };
	}

	async function generateDirect() {
		if (!task.trim()) return;
		setGenerating(true); setNotice(null); setPatch(null); setValidated(null);
		try {
			const { context, scope } = await prepareContext();
			const response = await apiFetch<DirectGenerationResponse>({
				path: '/nodera/v1/ai/generate', method: 'POST',
				data: { postId: props.postId, context, currentBlocks: stripBlocks(scope.target), editableStableIds: targetIds(scope.target), visualFacts: context.visualFacts || {} },
			});
			setPatch(response.patch); setValidated(response);
			setNotice({ status: 'success', message: __('AI generated and server-validated a Gutenberg patch. Review it before Apply.', 'nodera') });
		} catch (error) {
			setNotice({ status: 'warning', message: error instanceof Error ? error.message : __('Direct AI generation failed.', 'nodera') });
		} finally { setGenerating(false); }
	}

	async function exportContext() {
		try {
			const { context } = await prepareContext();
			await navigator.clipboard.writeText(oneShotPrompt(context));
			setNotice({ status: 'success', message: __('AI prompt and context copied.', 'nodera') });
		} catch (error) { setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Could not export AI context.', 'nodera') }); }
	}

	async function copyContext() {
		if (!exported) return;
		await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
		setNotice({ status: 'success', message: __('Context JSON copied.', 'nodera') });
	}

	function downloadBundle() {
		if (!exported) return;
		const blob = new Blob([JSON.stringify({ schema: 'nodera-ai-bundle/v1', context: exported, prompt: oneShotPrompt(exported) }, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'nodera-ai-bundle.json'; anchor.click(); URL.revokeObjectURL(url);
	}

	async function validate() {
		try {
			const parsed = normalizeAiResult(result);
			const scope = await currentScope();
			const response = await apiFetch<ValidationResponse>({ path: '/nodera/v1/ai/validate', method: 'POST', data: { postId: props.postId, currentBlocks: stripBlocks(scope.target), editableStableIds: targetIds(scope.target), visualFacts: exported?.visualFacts || {}, patch: parsed } });
			setPatch(parsed); setValidated(response); setNotice(null);
		} catch (error) { setPatch(null); setValidated(null); setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Validation failed.', 'nodera') }); }
	}

	async function apply() {
		if (!patch || !validated) return;
		const scope = await currentScope();
		if (await fingerprint(scope.target) !== patch.target.fingerprint) {
			setNotice({ status: 'error', message: __('Target changed after validation. Generate or validate again.', 'nodera') }); return;
		}
		applyPatch(patch, scope.blocks);
		setNotice({ status: 'success', message: __('Applied to Gutenberg. Native Undo reverts it; Save/Update persists it.', 'nodera') });
	}

	return <div className="nodera-panel">
		<p className="nodera-target"><strong>{__('Target', 'nodera')}:</strong> {props.target.length === props.blocks.length ? __('Whole page', 'nodera') : __('Selected Gutenberg subtree', 'nodera')}</p>
		{provider?.configured
			? <Notice status="success" isDismissible={false}>{__('Direct AI', 'nodera')}: {provider.provider}{provider.model ? ` · ${provider.model}` : ''}</Notice>
			: <Notice status="warning" isDismissible={false}>{__('Direct AI is not configured.', 'nodera')} {window.NoderaSettings?.settingsUrl && <a href={window.NoderaSettings.settingsUrl}>{__('Open Nodera AI settings', 'nodera')}</a>}</Notice>}
		<TextareaControl label={__('What should Nodera change?', 'nodera')} value={task} onChange={setTask} rows={4} />
		<SelectControl label={__('AI contract scope', 'nodera')} value={contractMode} options={[{ label: __('Focused', 'nodera'), value: 'focused' }, { label: __('Expanded', 'nodera'), value: 'expanded' }, { label: __('Full', 'nodera'), value: 'full' }]} onChange={(value) => setContractMode(value as typeof contractMode)} />
		<Button variant="primary" onClick={generateDirect} disabled={!task.trim() || generating || !provider?.configured}>{generating ? <><Spinner /> {__('Generating…', 'nodera')}</> : __('Generate in Gutenberg', 'nodera')}</Button>
		{notice && <Notice status={notice.status} isDismissible={false}>{notice.message}</Notice>}
		{validated && <Review response={validated} />}
		{validated && patch && <Button variant="primary" onClick={apply}>{__('Apply to Gutenberg', 'nodera')}</Button>}
		<details className="nodera-manual-ai"><summary>{__('Manual external AI fallback', 'nodera')}</summary>
			<div className="nodera-actions"><Button variant="secondary" onClick={exportContext} disabled={!task.trim()}>{__('Copy for external AI', 'nodera')}</Button><Button variant="tertiary" onClick={copyContext} disabled={!exported}>{__('Copy context', 'nodera')}</Button><Button variant="tertiary" onClick={downloadBundle} disabled={!exported}>{__('Download bundle', 'nodera')}</Button></div>
			<TextareaControl label={__('Paste nodera-patch/v1 result', 'nodera')} value={result} onChange={setResult} rows={9} />
			<Button variant="secondary" onClick={validate} disabled={!result.trim()}>{__('Validate & Preview', 'nodera')}</Button>
		</details>
	</div>;
}
