import { Button, Notice, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { NoderaBlock } from '../types';

type Style = Record<string, any>;

function edges(value: string) {
	return value ? { top: value, right: value, bottom: value, left: value } : undefined;
}

export function ResponsivePanel({ block, device, setDevice, update }: {
	block: NoderaBlock | null;
	device: 'tablet' | 'mobile';
	setDevice: (value: 'tablet' | 'mobile') => void;
	update: (attributes: Record<string, unknown>) => void;
}) {
	if (!block) return <p>{__('Select a block to edit responsive styles.', 'nodera')}</p>;
	if (!window.NoderaSettings?.nativeResponsive) return <Notice status="warning" isDismissible={false}>{__('Native responsive styles require WordPress 7.1 or newer.', 'nodera')}</Notice>;

	const style = (block.attributes?.style || {}) as Style;
	const stateKey = device === 'tablet' ? '@tablet' : '@mobile';
	const state = (style[stateKey] || {}) as Style;
	const padding = state.spacing?.padding?.top || '';
	const margin = state.spacing?.margin?.top || '';
	const gap = typeof state.spacing?.blockGap === 'string' ? state.spacing.blockGap : '';
	const fontSize = state.typography?.fontSize || '';
	const lineHeight = state.typography?.lineHeight || '';
	const text = state.color?.text || '';
	const background = state.color?.background || '';

	const setState = (next: Style) => update({ style: { ...style, [stateKey]: next } });
	const patch = (group: string, value: Style) => setState({ ...state, [group]: { ...(state[group] || {}), ...value } });
	const reset = () => {
		const next = { ...style };
		delete next[stateKey];
		update({ style: next });
	};

	return <div className="nodera-panel">
		<Notice status="info" isDismissible={false}>{__('Stored in Gutenberg’s native style.@tablet / style.@mobile attributes and rendered by the WordPress Style Engine.', 'nodera')}</Notice>
		<SelectControl label={__('Viewport', 'nodera')} value={device} options={[{ label: __('Tablet', 'nodera'), value: 'tablet' }, { label: __('Mobile', 'nodera'), value: 'mobile' }]} onChange={(value) => setDevice(value as 'tablet' | 'mobile')} />
		<TextControl label={__('Padding (all sides)', 'nodera')} value={padding} placeholder="24px" onChange={(value) => patch('spacing', { padding: edges(value) })} />
		<TextControl label={__('Margin (all sides)', 'nodera')} value={margin} placeholder="0px" onChange={(value) => patch('spacing', { margin: edges(value) })} />
		<TextControl label={__('Block gap', 'nodera')} value={gap} placeholder="16px" onChange={(value) => patch('spacing', { blockGap: value || undefined })} />
		<TextControl label={__('Font size', 'nodera')} value={fontSize} placeholder="32px" onChange={(value) => patch('typography', { fontSize: value || undefined })} />
		<TextControl label={__('Line height', 'nodera')} value={lineHeight} placeholder="1.2" onChange={(value) => patch('typography', { lineHeight: value || undefined })} />
		<TextControl label={__('Text color', 'nodera')} value={text} placeholder="var:preset|color|contrast" onChange={(value) => patch('color', { text: value || undefined })} />
		<TextControl label={__('Background color', 'nodera')} value={background} placeholder="var:preset|color|base" onChange={(value) => patch('color', { background: value || undefined })} />
		<Button variant="tertiary" onClick={reset}>{__('Reset this viewport', 'nodera')}</Button>
	</div>;
}
