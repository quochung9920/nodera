import { Button, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { NoderaBlock } from '../types';

const fields = [
	['paddingTop', 'Padding top'],
	['paddingRight', 'Padding right'],
	['paddingBottom', 'Padding bottom'],
	['paddingLeft', 'Padding left'],
	['marginTop', 'Margin top'],
	['marginRight', 'Margin right'],
	['marginBottom', 'Margin bottom'],
	['marginLeft', 'Margin left'],
	['gap', 'Gap'],
	['width', 'Width'],
	['minWidth', 'Min width'],
	['maxWidth', 'Max width'],
	['fontSize', 'Font size'],
	['lineHeight', 'Line height'],
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
	if (!block) return <p>{__('Select a block to edit responsive overrides.', 'nodera')}</p>;
	const responsive = (block.attributes?.noderaResponsive || {}) as Record<string, Record<string, string>>;
	const values = responsive[device] || {};
	const setValue = (key: string, value: string) => update({
		noderaResponsive: {
			...responsive,
			[device]: { ...values, [key]: value },
		},
	});
	const reset = () => update({ noderaResponsive: { ...responsive, [device]: {} } });

	return (
		<div className="nodera-panel">
			<p>{__('Desktop/base values remain owned by native Gutenberg controls. Nodera stores only responsive overrides.', 'nodera')}</p>
			<SelectControl
				label={__('Device override', 'nodera')}
				value={device}
				options={[
					{ label: __('Tablet', 'nodera'), value: 'tablet' },
					{ label: __('Mobile', 'nodera'), value: 'mobile' },
				]}
				onChange={(value) => setDevice(value as 'tablet' | 'mobile')}
			/>
			<div className="nodera-field-grid">
				{fields.map(([key, label]) => (
					<TextControl key={key} label={__(label, 'nodera')} value={values[key] || ''} placeholder="e.g. 24px" onChange={(value) => setValue(key, value)} />
				))}
			</div>
			<SelectControl
				label={__('Flex direction', 'nodera')}
				value={values.flexDirection || ''}
				options={[
					{ label: __('Inherit', 'nodera'), value: '' },
					{ label: 'row', value: 'row' },
					{ label: 'column', value: 'column' },
					{ label: 'row-reverse', value: 'row-reverse' },
					{ label: 'column-reverse', value: 'column-reverse' },
				]}
				onChange={(value) => setValue('flexDirection', value)}
			/>
			<SelectControl
				label={__('Flex wrap', 'nodera')}
				value={values.flexWrap || ''}
				options={[
					{ label: __('Inherit', 'nodera'), value: '' },
					{ label: 'nowrap', value: 'nowrap' },
					{ label: 'wrap', value: 'wrap' },
					{ label: 'wrap-reverse', value: 'wrap-reverse' },
				]}
				onChange={(value) => setValue('flexWrap', value)}
			/>
			<Button variant="tertiary" onClick={reset}>{__('Reset this device', 'nodera')}</Button>
		</div>
	);
}
