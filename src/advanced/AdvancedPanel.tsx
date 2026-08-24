import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, SelectControl, TextareaControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import type { NoderaBlock } from '../types';
import { getStyleValue, pseudoPath, setStyleValue } from '../gutenberg/styleStates';

type PseudoState = 'hover' | 'focus' | 'focus-visible' | 'active';

export function AdvancedPanel({ block, update }: { block: NoderaBlock | null; update: (attributes: Record<string, unknown>) => void }) {
	const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);
	const [state, setState] = useState<PseudoState>('hover');
	useEffect(() => { apiFetch<Record<string, unknown>>({ path: '/nodera/v1/diagnostics' }).then(setDiagnostics).catch(() => undefined); }, []);
	if (!block) return <p>{__('Select a block for interaction states and advanced styles.', 'nodera')}</p>;

	const native = Boolean(window.NoderaSettings?.nativeStyleStates) && ['core/button', 'core/navigation-link'].includes(block.name);
	const style = block.attributes?.style || {};
	const stateStyles = (block.attributes?.noderaStateStyles || {}) as Record<string, Record<string, string>>;
	const values = stateStyles[state] || {};
	const setLegacyValue = (key: string, value: string) => {
		const next = { ...values };
		if (value.trim()) next[key] = value.trim();
		else delete next[key];
		update({ noderaStateStyles: { ...stateStyles, [state]: next } });
	};
	const setNativeColor = (key: 'text' | 'background', value: string) => update({
		style: setStyleValue(style, pseudoPath(state, 'color', key), value),
	});
	const resetState = () => {
		if (native) {
			update({ style: setStyleValue(style, [`:${state}`], '') });
			return;
		}
		update({ noderaStateStyles: { ...stateStyles, [state]: {} } });
	};

	return <div className="nodera-panel">
		{native ? (
			<Notice status="success" isDismissible={false}>{__('This block uses WordPress 7.1 native pseudo style states. Nodera writes to the existing Gutenberg style attribute.', 'nodera')}</Notice>
		) : (
			<Notice status="info" isDismissible={false}>{__('Native pseudo-state controls are currently exposed by WordPress for Button and Navigation Link. Other blocks keep the bounded Nodera compatibility layer.', 'nodera')}</Notice>
		)}
		<SelectControl
			label={__('State', 'nodera')}
			value={state}
			options={[
				{ label: 'Hover', value: 'hover' },
				{ label: 'Focus', value: 'focus' },
				{ label: 'Focus visible', value: 'focus-visible' },
				{ label: 'Active', value: 'active' },
			]}
			onChange={(value) => setState(value as PseudoState)}
		/>
		{native ? (
			<>
				<TextControl label={__('Text color', 'nodera')} placeholder="e.g. #ffffff or var:preset|color|base" value={getStyleValue(style, pseudoPath(state, 'color', 'text'))} onChange={(value) => setNativeColor('text', value)} />
				<TextControl label={__('Background color', 'nodera')} placeholder="e.g. #111111 or var:preset|color|contrast" value={getStyleValue(style, pseudoPath(state, 'color', 'background'))} onChange={(value) => setNativeColor('background', value)} />
			</>
		) : (
			<>
				<TextControl label={__('Opacity', 'nodera')} value={values.opacity || ''} onChange={(value) => setLegacyValue('opacity', value)} />
				<TextControl label={__('Border radius', 'nodera')} value={values.borderRadius || ''} placeholder="8px" onChange={(value) => setLegacyValue('borderRadius', value)} />
			</>
		)}
		<Button variant="tertiary" onClick={resetState}>{__('Reset this state', 'nodera')}</Button>
		<details className="nodera-manual-ai">
			<summary>{__('Scoped Custom CSS fallback', 'nodera')}</summary>
			<TextareaControl
				label={__('Scoped Custom CSS', 'nodera')}
				help={__('Use only &, &:hover, &:focus, &:focus-visible or &:active. @import and remote URLs are rejected.', 'nodera')}
				value={String(block.attributes?.noderaCustomCSS || '')}
				onChange={(value) => update({ noderaCustomCSS: value })}
				rows={7}
			/>
		</details>
		{diagnostics && <Notice status="info" isDismissible={false}><code>{JSON.stringify(diagnostics)}</code></Notice>}
		<Button variant="tertiary" onClick={() => update({ noderaStateStyles: {}, noderaCustomCSS: '' })}>{__('Reset legacy advanced styles', 'nodera')}</Button>
	</div>;
}
