import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';

type GlobalStyleRecord = Record<string, any>;

type DesignValues = {
	text: string;
	background: string;
	fontSize: string;
	lineHeight: string;
	blockGap: string;
	buttonText: string;
	buttonBackground: string;
};

const empty: DesignValues = { text: '', background: '', fontSize: '', lineHeight: '', blockGap: '', buttonText: '', buttonBackground: '' };

function readValues(record: GlobalStyleRecord): DesignValues {
	return {
		text: record.styles?.color?.text || '',
		background: record.styles?.color?.background || '',
		fontSize: record.styles?.typography?.fontSize || '',
		lineHeight: record.styles?.typography?.lineHeight || '',
		blockGap: record.styles?.spacing?.blockGap || '',
		buttonText: record.styles?.elements?.button?.color?.text || '',
		buttonBackground: record.styles?.elements?.button?.color?.background || '',
	};
}

export function DesignPanel() {
	const [record, setRecord] = useState<GlobalStyleRecord | null>(null);
	const [original, setOriginal] = useState<DesignValues>(empty);
	const [values, setValues] = useState<DesignValues>(empty);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const theme = window.NoderaSettings?.theme || '';

	useEffect(() => {
		if (!theme) return;
		apiFetch<GlobalStyleRecord>({ path: `/wp/v2/global-styles/themes/${encodeURIComponent(theme)}` })
			.then((data) => {
				const initial = readValues(data);
				setRecord(data);
				setOriginal(initial);
				setValues(initial);
			})
			.catch((reason) => setError(reason instanceof Error ? reason.message : __('Global Styles are not writable in this editor context.', 'nodera')));
	}, [theme]);

	function setValue(key: keyof DesignValues, value: string) {
		setValues((current) => ({ ...current, [key]: value }));
	}

	async function save(nextValues = values) {
		if (!record?.id) return;
		setSaving(true);
		setError('');
		try {
			const styles = {
				...(record.styles || {}),
				color: {
					...(record.styles?.color || {}),
					text: nextValues.text || undefined,
					background: nextValues.background || undefined,
				},
				typography: {
					...(record.styles?.typography || {}),
					fontSize: nextValues.fontSize || undefined,
					lineHeight: nextValues.lineHeight || undefined,
				},
				spacing: {
					...(record.styles?.spacing || {}),
					blockGap: nextValues.blockGap || undefined,
				},
				elements: {
					...(record.styles?.elements || {}),
					button: {
						...(record.styles?.elements?.button || {}),
						color: {
							...(record.styles?.elements?.button?.color || {}),
							text: nextValues.buttonText || undefined,
							background: nextValues.buttonBackground || undefined,
						},
					},
				},
			};
			const updated = await apiFetch<GlobalStyleRecord>({ path: `/wp/v2/global-styles/${record.id}`, method: 'PUT', data: { styles } });
			setRecord(updated);
			setValues(readValues(updated));
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : __('Could not update WordPress Global Styles.', 'nodera'));
		} finally {
			setSaving(false);
		}
	}

	async function reset() {
		setValues(original);
		await save(original);
	}

	if (error && !record) return <Notice status="warning" isDismissible={false}>{error}</Notice>;
	if (!record) return <p>{__('Loading native WordPress Global Styles…', 'nodera')}</p>;
	return <div className="nodera-panel">
		<Notice status="success" isDismissible={false}>{__('Global Design writes to WordPress Global Styles. Nodera does not maintain a parallel token database.', 'nodera')}</Notice>
		{error && <Notice status="error" isDismissible={false}>{error}</Notice>}
		<h3>{__('Site colors', 'nodera')}</h3>
		<TextControl label={__('Text color', 'nodera')} value={values.text} placeholder="var:preset|color|contrast" onChange={(value) => setValue('text', value)} />
		<TextControl label={__('Background color', 'nodera')} value={values.background} placeholder="var:preset|color|base" onChange={(value) => setValue('background', value)} />
		<h3>{__('Typography', 'nodera')}</h3>
		<TextControl label={__('Base font size', 'nodera')} value={values.fontSize} placeholder="1rem" onChange={(value) => setValue('fontSize', value)} />
		<TextControl label={__('Base line height', 'nodera')} value={values.lineHeight} placeholder="1.5" onChange={(value) => setValue('lineHeight', value)} />
		<h3>{__('Spacing', 'nodera')}</h3>
		<TextControl label={__('Global block gap', 'nodera')} value={values.blockGap} placeholder="1.5rem" onChange={(value) => setValue('blockGap', value)} />
		<h3>{__('Buttons', 'nodera')}</h3>
		<TextControl label={__('Button text color', 'nodera')} value={values.buttonText} placeholder="var:preset|color|base" onChange={(value) => setValue('buttonText', value)} />
		<TextControl label={__('Button background', 'nodera')} value={values.buttonBackground} placeholder="var:preset|color|contrast" onChange={(value) => setValue('buttonBackground', value)} />
		<div className="nodera-actions">
			<Button variant="primary" isBusy={saving} disabled={saving} onClick={() => save()}>{__('Save Global Styles', 'nodera')}</Button>
			<Button variant="tertiary" disabled={saving} onClick={reset}>{__('Restore loaded values', 'nodera')}</Button>
		</div>
	</div>;
}
