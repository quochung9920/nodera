import { Button, Notice, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { NoderaBlock } from '../types';
import { getStyleValue, migrateLegacyResponsive, responsivePath, setStyleValue } from '../gutenberg/styleStates';

const nativeFields = [
	['paddingTop', 'Padding top'],
	['paddingRight', 'Padding right'],
	['paddingBottom', 'Padding bottom'],
	['paddingLeft', 'Padding left'],
	['marginTop', 'Margin top'],
	['marginRight', 'Margin right'],
	['marginBottom', 'Margin bottom'],
	['marginLeft', 'Margin left'],
	['gap', 'Block gap'],
	['width', 'Width'],
	['minWidth', 'Minimum width'],
	['fontSize', 'Font size'],
	['lineHeight', 'Line height'],
] as const;

const legacyFields = [
	...nativeFields,
	['maxWidth', 'Maximum width'],
] as const;

export function ResponsivePanel({
	block,
	device,
	setDevice,
	update,
}: {
	block: NoderaBlock | null;
	device: 'tablet' | 'mobile';
	setDevice: (value: 'tablet' | 'mobile') => void;
	update: (attributes: Record<string, unknown>) => void;
}) {
	if (!block) return <p>{__('Select a block to edit responsive styles.', 'nodera')}</p>;
	const native = Boolean(window.NoderaSettings?.nativeResponsive);
	const legacy = (block.attributes?.noderaResponsive || {}) as Record<string, Record<string, string>>;
	const style = block.attributes?.style || {};
	const breakpoint = window.NoderaSettings?.breakpoints?.[device]?.maxWidth;

	const setNative = (key: string, value: string) => {
		const path = responsivePath(device, key);
		if (!path) return;
		update({ style: setStyleValue(style, path, value) });
	};
	const setLegacy = (key: string, value: string) => {
		const current = legacy[device] || {};
		const next = { ...current };
		if (value.trim()) next[key] = value.trim();
		else delete next[key];
		update({ noderaResponsive: { ...legacy, [device]: next } });
	};
	const reset = () => {
		if (native) {
			update({ style: setStyleValue(style, [`@${device}`], '') });
			return;
		}
		update({ noderaResponsive: { ...legacy, [device]: {} } });
	};
	const migrate = () => update({
		style: migrateLegacyResponsive(style, legacy),
		noderaResponsive: {},
	});

	return (
		<div className="nodera-panel">
			{native ? (
				<Notice status="success" isDismissible={false}>
					{__('WordPress 7.1 native responsive style states are active. Nodera writes directly to the block style attribute and WordPress renders the editor and frontend media queries.', 'nodera')}
				</Notice>
			) : (
				<Notice status="warning" isDismissible={false}>
					{__('This site is running a pre-7.1 WordPress editor. Nodera is using its bounded legacy responsive compatibility layer.', 'nodera')}
				</Notice>
			)}
			<p>{__('Desktop remains the normal Gutenberg/base style. Tablet and Mobile only store overrides.', 'nodera')}</p>
			<SelectControl
				label={__('Viewport', 'nodera')}
				value={device}
				options={[
					{ label: `${__('Tablet', 'nodera')}${breakpoint && device === 'tablet' ? ` (≤ ${breakpoint})` : ''}`, value: 'tablet' },
					{ label: `${__('Mobile', 'nodera')}${breakpoint && device === 'mobile' ? ` (≤ ${breakpoint})` : ''}`, value: 'mobile' },
				]}
				onChange={(value) => setDevice(value as 'tablet' | 'mobile')}
			/>
			<div className="nodera-field-grid">
				{(native ? nativeFields : legacyFields).map(([key, label]) => {
					const path = responsivePath(device, key);
					const value = native && path ? getStyleValue(style, path) : legacy[device]?.[key] || '';
					return <TextControl key={key} label={__(label, 'nodera')} value={value} placeholder="e.g. 1rem" onChange={(next) => native ? setNative(key, next) : setLegacy(key, next)} />;
				})}
			</div>
			{!native && (
				<>
					<SelectControl
						label={__('Flex direction (legacy fallback)', 'nodera')}
						value={legacy[device]?.flexDirection || ''}
						options={[
							{ label: __('Inherit', 'nodera'), value: '' },
							{ label: 'row', value: 'row' },
							{ label: 'column', value: 'column' },
							{ label: 'row-reverse', value: 'row-reverse' },
							{ label: 'column-reverse', value: 'column-reverse' },
						]}
						onChange={(value) => setLegacy('flexDirection', value)}
					/>
					<SelectControl
						label={__('Flex wrap (legacy fallback)', 'nodera')}
						value={legacy[device]?.flexWrap || ''}
						options={[
							{ label: __('Inherit', 'nodera'), value: '' },
							{ label: 'nowrap', value: 'nowrap' },
							{ label: 'wrap', value: 'wrap' },
							{ label: 'wrap-reverse', value: 'wrap-reverse' },
						]}
						onChange={(value) => setLegacy('flexWrap', value)}
					/>
				</>
			)}
			{native && Object.keys(legacy).length > 0 && (
				<Button variant="secondary" onClick={migrate}>{__('Migrate legacy responsive styles to Gutenberg', 'nodera')}</Button>
			)}
			<Button variant="tertiary" onClick={reset}>{__('Reset this viewport', 'nodera')}</Button>
		</div>
	);
}
