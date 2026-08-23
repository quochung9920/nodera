import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';

export function DesignPanel() {
	const [record, setRecord] = useState<Record<string, any> | null>(null);
	const [original, setOriginal] = useState<Record<string, any> | null>(null);
	const [text, setText] = useState('');
	const [background, setBackground] = useState('');
	const [error, setError] = useState('');
	const theme = window.NoderaSettings?.theme || '';

	useEffect(() => {
		if (!theme) return;
		apiFetch<Record<string, any>>({ path: `/wp/v2/global-styles/themes/${encodeURIComponent(theme)}` })
			.then((data) => {
				setRecord(data);
				setOriginal(JSON.parse(JSON.stringify(data)));
				setText(data.styles?.color?.text || '');
				setBackground(data.styles?.color?.background || '');
			})
			.catch((reason) => setError(reason instanceof Error ? reason.message : __('Global Styles are not writable in this editor context.', 'nodera')));
	}, [theme]);

	async function save(nextText = text, nextBackground = background) {
		if (!record?.id) return;
		const styles = { ...(record.styles || {}), color: { ...(record.styles?.color || {}), text: nextText || undefined, background: nextBackground || undefined } };
		const updated = await apiFetch<Record<string, any>>({ path: `/wp/v2/global-styles/${record.id}`, method: 'PUT', data: { styles } });
		setRecord(updated);
	}

	async function reset() {
		if (!original) return;
		const originalText = original.styles?.color?.text || '';
		const originalBackground = original.styles?.color?.background || '';
		setText(originalText);
		setBackground(originalBackground);
		await save(originalText, originalBackground);
	}

	if (error) return <Notice status="warning" isDismissible={false}>{error}</Notice>;
	if (!record) return <p>{__('Loading native WordPress Global Styles…', 'nodera')}</p>;
	return <div className="nodera-panel">
		<p>{__('These values are stored by WordPress Global Styles, not in a parallel Nodera design database.', 'nodera')}</p>
		<TextControl label={__('Text color', 'nodera')} value={text} placeholder="#111111" onChange={setText} />
		<TextControl label={__('Background color', 'nodera')} value={background} placeholder="#ffffff" onChange={setBackground} />
		<div className="nodera-actions"><Button variant="primary" onClick={() => save()}>{__('Save Global Style', 'nodera')}</Button><Button variant="tertiary" onClick={reset}>{__('Reset', 'nodera')}</Button></div>
	</div>;
}
