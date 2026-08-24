import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';

export function DesignPanel() {
	const [record, setRecord] = useState<Record<string, any> | null>(null);
	const [original, setOriginal] = useState<Record<string, any> | null>(null);
	const [values, setValues] = useState<Record<string, string>>({});
	const [error, setError] = useState('');
	const theme = window.NoderaSettings?.theme || '';

	function fromRecord(data: Record<string, any>) {
		return {
			text: data.styles?.color?.text || '', background: data.styles?.color?.background || '',
			fontFamily: data.styles?.typography?.fontFamily || '', fontSize: data.styles?.typography?.fontSize || '', lineHeight: data.styles?.typography?.lineHeight || '',
			blockGap: data.styles?.spacing?.blockGap || '', link: data.styles?.elements?.link?.color?.text || '',
			buttonText: data.styles?.blocks?.['core/button']?.color?.text || '', buttonBackground: data.styles?.blocks?.['core/button']?.color?.background || '', buttonRadius: data.styles?.blocks?.['core/button']?.border?.radius || '',
		};
	}

	useEffect(() => {
		if (!theme) return;
		apiFetch<Record<string, any>>({ path: `/wp/v2/global-styles/themes/${encodeURIComponent(theme)}` })
			.then((data) => { setRecord(data); setOriginal(JSON.parse(JSON.stringify(data))); setValues(fromRecord(data)); })
			.catch((reason) => setError(reason instanceof Error ? reason.message : __('Global Styles are not writable in this editor context.', 'nodera')));
	}, [theme]);

	async function save(next = values) {
		if (!record?.id) return;
		const styles = {
			...(record.styles || {}),
			color: { ...(record.styles?.color || {}), text: next.text || undefined, background: next.background || undefined },
			typography: { ...(record.styles?.typography || {}), fontFamily: next.fontFamily || undefined, fontSize: next.fontSize || undefined, lineHeight: next.lineHeight || undefined },
			spacing: { ...(record.styles?.spacing || {}), blockGap: next.blockGap || undefined },
			elements: { ...(record.styles?.elements || {}), link: { ...(record.styles?.elements?.link || {}), color: { ...(record.styles?.elements?.link?.color || {}), text: next.link || undefined } } },
			blocks: { ...(record.styles?.blocks || {}), 'core/button': { ...(record.styles?.blocks?.['core/button'] || {}), color: { ...(record.styles?.blocks?.['core/button']?.color || {}), text: next.buttonText || undefined, background: next.buttonBackground || undefined }, border: { ...(record.styles?.blocks?.['core/button']?.border || {}), radius: next.buttonRadius || undefined } } },
		};
		const updated = await apiFetch<Record<string, any>>({ path: `/wp/v2/global-styles/${record.id}`, method: 'PUT', data: { styles } });
		setRecord(updated); setValues(fromRecord(updated));
	}

	async function reset() {
		if (!original?.id) return;
		const updated = await apiFetch<Record<string, any>>({ path: `/wp/v2/global-styles/${original.id}`, method: 'PUT', data: { styles: original.styles || {} } });
		setRecord(updated); setValues(fromRecord(updated));
	}
	const field = (key: string, label: string, placeholder = '') => <TextControl label={__(label, 'nodera')} value={values[key] || ''} placeholder={placeholder} onChange={(value)=>setValues({...values,[key]:value})} />;
	if (error) return <Notice status="warning" isDismissible={false}>{error}</Notice>;
	if (!record) return <p>{__('Loading native WordPress Global Styles…', 'nodera')}</p>;
	return <div className="nodera-panel">
		<Notice status="info" isDismissible={false}>{__('All values are written to WordPress Global Styles/theme.json data. Nodera does not maintain a parallel design-token database.', 'nodera')}</Notice>
		{field('text','Site text color','var:preset|color|contrast')}{field('background','Site background','var:preset|color|base')}{field('link','Link color','var:preset|color|accent-1')}
		{field('fontFamily','Base font family','var:preset|font-family|body')}{field('fontSize','Base font size','1rem')}{field('lineHeight','Base line height','1.5')}{field('blockGap','Global block gap','1.5rem')}
		{field('buttonText','Button text','var:preset|color|base')}{field('buttonBackground','Button background','var:preset|color|contrast')}{field('buttonRadius','Button radius','8px')}
		<div className="nodera-actions"><Button variant="primary" onClick={() => save()}>{__('Save Global Styles', 'nodera')}</Button><Button variant="tertiary" onClick={reset}>{__('Reset to loaded styles', 'nodera')}</Button></div>
	</div>;
}
