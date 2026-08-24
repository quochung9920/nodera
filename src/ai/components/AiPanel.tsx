import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, SelectControl, Spinner, TextareaControl } from '@wordpress/components';
import { select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { NoderaAiExport, NoderaBlock, NoderaPatch, NoderaTargetKind, ValidationResponse } from '../../types';
import { ensureIdentities, ensureRootIdentities, flattenBlocks } from '../../identity';
import { buildAiContext, portableAiPrompt } from '../context';
import { stripBlocks, fingerprint } from '../fingerprint';
import { normalizeAiResult } from '../normalizer';
import { applyPatch } from '../patch';
import { Review } from './Review';

type DirectGenerationResponse = ValidationResponse & { patch: NoderaPatch };
type Scope = { blocks: NoderaBlock[]; target: NoderaBlock[]; targetKind: NoderaTargetKind };
type ExportAction = 'copy' | 'json' | 'prompt';

export function AiPanel(props: {
	blocks: NoderaBlock[];
	target: NoderaBlock[];
	targetKind: 'subtree' | 'page';
	ancestors: NoderaBlock[];
	siblings: NoderaBlock[];
	postId: number;
	postType: string;
	postTitle: string;
	design: Record<string, unknown>;
}) {
	const [task, setTaskState] = useState('');
	const [result, setResultState] = useState('');
	const [contractMode, setContractModeState] = useState<'focused' | 'expanded' | 'full'>('expanded');
	const [targetMode, setTargetModeState] = useState<'block' | 'subtree'>('block');
	const [exported, setExported] = useState<NoderaAiExport | null>(null);
	const [patch, setPatch] = useState<NoderaPatch | null>(null);
	const [validated, setValidated] = useState<ValidationResponse | null>(null);
	const [generating, setGenerating] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [notice, setNotice] = useState<{ status: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
	const provider = window.NoderaSettings?.aiProvider;

	function invalidateExport() {
		setExported(null);
		setPatch(null);
		setValidated(null);
	}

	function setTask(value: string) {
		setTaskState(value);
		invalidateExport();
	}

	function setContractMode(value: typeof contractMode) {
		setContractModeState(value);
		invalidateExport();
	}

	function setTargetMode(value: 'block' | 'subtree') {
		setTargetModeState(value);
		invalidateExport();
	}

	function setResult(value: string) {
		setResultState(value);
		setPatch(null);
		setValidated(null);
	}

	async function currentScope(): Promise<Scope> {
		const effectiveKind: NoderaTargetKind = props.targetKind === 'page' ? 'page' : targetMode;
		if (effectiveKind === 'block') ensureRootIdentities(props.target);
		else ensureIdentities(props.target);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		const store = select('core/block-editor') as any;
		const blocks = (store.getBlocks?.() || props.blocks) as NoderaBlock[];
		const target = effectiveKind === 'page'
			? blocks
			: props.target.map((item) => item.clientId ? store.getBlock(item.clientId) : item).filter(Boolean) as NoderaBlock[];
		return { blocks, target, targetKind: effectiveKind };
	}

	function targetIds(scope: NoderaBlock[], kind: NoderaTargetKind) {
		const editable = kind === 'block' ? scope : flattenBlocks(scope);
		return editable.map((block) => block.attributes?.noderaId).filter((id): id is string => typeof id === 'string');
	}

	async function prepareContext() {
		const scope = await currentScope();
		const context = await buildAiContext({
			task,
			target: scope.target,
			targetKind: scope.targetKind,
			ancestors: props.ancestors,
			siblings: props.siblings,
			postType: props.postType,
			postTitle: props.postTitle,
			mode: scope.targetKind === 'page' ? 'create' : scope.targetKind === 'block' ? 'edit' : 'redesign',
			contractMode,
			design: props.design,
		});
		return { context, scope };
	}

	async function prepareExport(): Promise<{ session: NoderaAiExport; scope: Scope }> {
		const { context, scope } = await prepareContext();
		const session = await apiFetch<NoderaAiExport>({
			path: '/nodera/v1/ai/export',
			method: 'POST',
			data: {
				postId: props.postId,
				context,
				currentBlocks: stripBlocks(scope.target),
				editableStableIds: targetIds(scope.target, scope.targetKind),
			},
		});
		setExported(session);
		return { session, scope };
	}

	function download(filename: string, content: string, type: string) {
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	}

	async function exportSession(action: ExportAction) {
		setExporting(true);
		setNotice(null);
		try {
			const { session } = await prepareExport();
			const prompt = portableAiPrompt(session);
			if (action === 'copy') {
				await navigator.clipboard.writeText(prompt);
				setNotice({ status: 'success', message: __('Portable AI session copied. Paste it into any external AI and ask it to return nodera-patch/v1 JSON.', 'nodera') });
			} else if (action === 'json') {
				download(`nodera-${session.sessionId}.json`, JSON.stringify(session, null, 2), 'application/json');
				setNotice({ status: 'success', message: __('Portable AI session JSON downloaded.', 'nodera') });
			} else {
				download(`nodera-${session.sessionId}-prompt.txt`, prompt, 'text/plain;charset=utf-8');
				setNotice({ status: 'success', message: __('AI prompt downloaded.', 'nodera') });
			}
		} catch (error) {
			setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Could not export the AI session.', 'nodera') });
		} finally {
			setExporting(false);
		}
	}

	function assertMatchesExport(candidate: NoderaPatch) {
		if (!exported) return;
		const expectedIds = [...exported.target.stableIds].sort();
		const actualIds = [...candidate.target.stableIds].sort();
		if (candidate.target.fingerprint !== exported.target.fingerprint || candidate.target.kind !== exported.target.kind || JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) {
			throw new Error(__('The imported patch does not belong to the most recently exported Nodera session.', 'nodera'));
		}
	}

	async function validate() {
		try {
			const parsed = normalizeAiResult(result);
			assertMatchesExport(parsed);
			const scope = await currentScope();
			const response = await apiFetch<ValidationResponse>({
				path: '/nodera/v1/ai/validate',
				method: 'POST',
				data: {
					postId: props.postId,
					currentBlocks: stripBlocks(scope.target),
					editableStableIds: targetIds(scope.target, scope.targetKind),
					visualFacts: exported?.context?.visualFacts || {},
					patch: parsed,
				},
			});
			setPatch(parsed);
			setValidated(response);
			setNotice({ status: 'success', message: __('Imported AI result is valid. Review the diff and quality findings before Apply.', 'nodera') });
		} catch (error) {
			setPatch(null);
			setValidated(null);
			setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Validation failed.', 'nodera') });
		}
	}

	async function importFile(event: any) {
		const file = event.target?.files?.[0] as File | undefined;
		if (!file) return;
		try {
			if (file.size > 1048576) throw new Error(__('AI result file exceeds the 1 MiB import limit.', 'nodera'));
			setResult(await file.text());
			setNotice({ status: 'info', message: __('AI result loaded. Validate it before Apply.', 'nodera') });
		} catch (error) {
			setNotice({ status: 'error', message: error instanceof Error ? error.message : __('Could not read the AI result file.', 'nodera') });
		} finally {
			event.target.value = '';
		}
	}

	async function generateDirect() {
		if (!task.trim() || !provider?.configured) return;
		setGenerating(true);
		setNotice(null);
		setPatch(null);
		setValidated(null);
		try {
			const { context, scope } = await prepareContext();
			const response = await apiFetch<DirectGenerationResponse>({
				path: '/nodera/v1/ai/generate',
				method: 'POST',
				data: {
					postId: props.postId,
					context,
					currentBlocks: stripBlocks(scope.target),
					editableStableIds: targetIds(scope.target, scope.targetKind),
					visualFacts: context.visualFacts || {},
				},
			});
			setPatch(response.patch);
			setValidated(response);
			setNotice({ status: 'success', message: __('Direct provider result was generated and validated. Review it before Apply.', 'nodera') });
		} catch (error) {
			setNotice({ status: 'warning', message: error instanceof Error ? error.message : __('Direct AI generation failed.', 'nodera') });
		} finally {
			setGenerating(false);
		}
	}

	async function apply() {
		if (!patch || !validated) return;
		const scope = await currentScope();
		if (await fingerprint(scope.target) !== patch.target.fingerprint) {
			setNotice({ status: 'error', message: __('Target changed after export or validation. Export a fresh session and validate again.', 'nodera') });
			return;
		}
		applyPatch(patch, scope.blocks);
		setNotice({ status: 'success', message: __('Applied to Gutenberg. Native Undo reverts it; Save/Update persists it.', 'nodera') });
	}

	const hasInnerBlocks = Boolean(props.target[0]?.innerBlocks?.length);

	return <div className="nodera-panel">
		<Notice status="info" isDismissible={false}>{__('No API key is required. Export this Gutenberg target, process it with any external AI, then import the returned nodera-patch/v1.', 'nodera')}</Notice>
		<p className="nodera-target"><strong>{__('Target', 'nodera')}:</strong> {props.targetKind === 'page' ? __('Whole page', 'nodera') : targetMode === 'block' ? __('Selected block only', 'nodera') : __('Selected block + inner blocks', 'nodera')}</p>
		{props.targetKind !== 'page' && <SelectControl
			label={__('Export target scope', 'nodera')}
			value={targetMode}
			options={[
				{ label: __('Selected block only', 'nodera'), value: 'block' },
				{ label: hasInnerBlocks ? __('Selected block + inner blocks', 'nodera') : __('Selected subtree (same as block here)', 'nodera'), value: 'subtree' },
			]}
			onChange={(value) => setTargetMode(value as 'block' | 'subtree')}
		/>}
		<TextareaControl label={__('What should the external AI change?', 'nodera')} value={task} onChange={setTask} rows={4} help={__('Optional but recommended. The exported session is self-contained and includes this task.', 'nodera')} />
		<SelectControl label={__('AI contract scope', 'nodera')} value={contractMode} options={[{ label: __('Focused', 'nodera'), value: 'focused' }, { label: __('Expanded', 'nodera'), value: 'expanded' }, { label: __('Full', 'nodera'), value: 'full' }]} onChange={(value) => setContractMode(value as typeof contractMode)} />

		<div className="nodera-actions nodera-export-actions">
			<Button variant="primary" onClick={() => exportSession('copy')} disabled={exporting}>{exporting ? <><Spinner /> {__('Preparing…', 'nodera')}</> : __('Copy for AI', 'nodera')}</Button>
			<Button variant="secondary" onClick={() => exportSession('json')} disabled={exporting}>{__('Download Session JSON', 'nodera')}</Button>
			<Button variant="tertiary" onClick={() => exportSession('prompt')} disabled={exporting}>{__('Download Prompt', 'nodera')}</Button>
		</div>
		{exported && <p className="nodera-session-id"><strong>{__('Session', 'nodera')}:</strong> <code>{exported.sessionId}</code></p>}

		<hr />
		<h3>{__('Import AI Result', 'nodera')}</h3>
		<TextareaControl label={__('Paste nodera-patch/v1 JSON', 'nodera')} value={result} onChange={setResult} rows={9} />
		<label className="nodera-file-import">
			<span>{__('Or upload AI result JSON', 'nodera')}</span>
			<input type="file" accept="application/json,.json,text/plain" onChange={importFile} />
		</label>
		<Button variant="secondary" onClick={validate} disabled={!result.trim()}>{__('Validate & Preview', 'nodera')}</Button>

		{notice && <Notice status={notice.status} isDismissible={false}>{notice.message}</Notice>}
		{validated && <Review response={validated} />}
		{validated && patch && <Button variant="primary" onClick={apply}>{__('Apply to Gutenberg', 'nodera')}</Button>}

		<details className="nodera-direct-ai">
			<summary>{__('Optional direct AI provider', 'nodera')}</summary>
			{provider?.configured
				? <><Notice status="info" isDismissible={false}>{provider.provider}{provider.model ? ` · ${provider.model}` : ''} {provider.source ? ` · ${provider.source}` : ''}</Notice><Button variant="secondary" onClick={generateDirect} disabled={!task.trim() || generating}>{generating ? <><Spinner /> {__('Generating…', 'nodera')}</> : __('Generate with configured provider', 'nodera')}</Button></>
				: <p>{__('Not configured — and not required for the portable export/import workflow.', 'nodera')} {window.NoderaSettings?.settingsUrl && <a href={window.NoderaSettings.settingsUrl}>{__('Provider settings', 'nodera')}</a>}</p>}
		</details>
	</div>;
}
