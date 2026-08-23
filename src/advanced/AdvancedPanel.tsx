import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, SelectControl, TextareaControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import type { NoderaBlock } from '../types';

export function AdvancedPanel({ block, update }: { block: NoderaBlock | null; update: (attributes: Record<string, unknown>) => void }) {
	const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);
	const [state, setState] = useState('hover');
	useEffect(() => { apiFetch<Record<string, unknown>>({ path: '/nodera/v1/diagnostics' }).then(setDiagnostics).catch(() => undefined); }, []);
	if (!block) return <p>{__('Select a block for state styles and scoped CSS.', 'nodera')}</p>;
	const stateStyles = (block.attributes?.noderaStateStyles || {}) as Record<string, Record<string, string>>;
	const values = stateStyles[state] || {};
	const setStateValue = (key: string, value: string) => update({ noderaStateStyles: { ...stateStyles, [state]: { ...values, [key]: value } } });
	return <div className="nodera-panel">
		<SelectControl label={__('State', 'nodera')} value={state} options={[{label:'Hover',value:'hover'},{label:'Focus',value:'focus'},{label:'Active',value:'active'}]} onChange={setState} />
		<TextControl label={__('Opacity', 'nodera')} value={values.opacity || ''} onChange={(value)=>setStateValue('opacity', value)} />
		<TextControl label={__('Border radius', 'nodera')} value={values.borderRadius || ''} placeholder="8px" onChange={(value)=>setStateValue('borderRadius', value)} />
		<TextareaControl label={__('Scoped Custom CSS', 'nodera')} help={__('Use only &, &:hover, &:focus or &:active. @import and remote URLs are rejected.', 'nodera')} value={String(block.attributes?.noderaCustomCSS || '')} onChange={(value)=>update({noderaCustomCSS:value})} rows={7} />
		{diagnostics && <Notice status="info" isDismissible={false}><code>{JSON.stringify(diagnostics)}</code></Notice>}
		<Button variant="tertiary" onClick={()=>update({noderaStateStyles:{},noderaCustomCSS:''})}>{__('Reset advanced styles', 'nodera')}</Button>
	</div>;
}
