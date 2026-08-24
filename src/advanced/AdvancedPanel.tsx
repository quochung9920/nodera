import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, SelectControl, TextareaControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import type { NoderaBlock } from '../types';

export function AdvancedPanel({ block, update }: { block: NoderaBlock | null; update: (attributes: Record<string, unknown>) => void }) {
	const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);
	const [state, setState] = useState(':hover');
	useEffect(() => { apiFetch<Record<string, unknown>>({ path: '/nodera/v1/diagnostics' }).then(setDiagnostics).catch(() => undefined); }, []);
	if (!block) return <p>{__('Select a block for state styles and scoped CSS.', 'nodera')}</p>;

	const nativeBlocks = window.NoderaSettings?.nativePseudoStates || [];
	const supportsNative = nativeBlocks.includes(block.name);
	const style = (block.attributes?.style || {}) as Record<string, any>;
	const values = (style[state] || {}) as Record<string, any>;
	const patchGroup = (group: string, value: Record<string, unknown>) => update({ style: { ...style, [state]: { ...values, [group]: { ...(values[group] || {}), ...value } } } });
	const resetState = () => { const next = { ...style }; delete next[state]; update({ style: next }); };

	return <div className="nodera-panel">
		{supportsNative ? <>
			<Notice status="info" isDismissible={false}>{__('This block uses native WordPress style states. No Nodera state CSS is generated.', 'nodera')}</Notice>
			<SelectControl label={__('State', 'nodera')} value={state} options={[
				{label:'Hover',value:':hover'}, {label:'Focus',value:':focus'}, {label:'Focus visible',value:':focus-visible'}, {label:'Active',value:':active'}
			]} onChange={setState} />
			<TextControl label={__('Text color', 'nodera')} value={values.color?.text || ''} placeholder="var:preset|color|contrast" onChange={(value)=>patchGroup('color',{text:value || undefined})} />
			<TextControl label={__('Background color', 'nodera')} value={values.color?.background || ''} placeholder="var:preset|color|accent-1" onChange={(value)=>patchGroup('color',{background:value || undefined})} />
			<TextControl label={__('Border radius', 'nodera')} value={values.border?.radius || ''} placeholder="8px" onChange={(value)=>patchGroup('border',{radius:value || undefined})} />
			<Button variant="tertiary" onClick={resetState}>{__('Reset this native state', 'nodera')}</Button>
		</> : <Notice status="info" isDismissible={false}>{__('WordPress 7.1 currently exposes block-instance pseudo states for Button and Navigation Link. Nodera will not invent a parallel state engine for this block.', 'nodera')}</Notice>}

		<TextareaControl label={__('Scoped Custom CSS fallback', 'nodera')} help={__('Use only when Gutenberg cannot express the required effect. Remote URLs and @import are rejected.', 'nodera')} value={String(block.attributes?.noderaCustomCSS || '')} onChange={(value)=>update({noderaCustomCSS:value})} rows={6} />
		{diagnostics && <Notice status="info" isDismissible={false}><code>{JSON.stringify(diagnostics)}</code></Notice>}
		<Button variant="tertiary" onClick={()=>update({noderaCustomCSS:''})}>{__('Clear Custom CSS', 'nodera')}</Button>
	</div>;
}
