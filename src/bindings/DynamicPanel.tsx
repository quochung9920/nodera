import { Button, Notice, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useMemo, useState } from '@wordpress/element';
import type { NoderaBlock } from '../types';

const attributesByBlock: Record<string, string[]> = {
	'core/heading': ['content'],
	'core/paragraph': ['content'],
	'core/button': ['text', 'url', 'linkTarget', 'rel'],
	'core/image': ['id', 'url', 'title', 'alt', 'caption'],
	'core/navigation-link': ['url'],
	'core/navigation-submenu': ['url'],
	'core/post-date': ['datetime'],
};

type SourceChoice = 'post-meta' | 'post-date' | 'post-modified' | 'post-link';

function bindingFor(source: SourceChoice, metaKey: string) {
	if (source === 'post-meta') return { source: 'core/post-meta', args: { key: metaKey } };
	return { source: 'core/post-data', args: { field: source.replace('post-', '') } };
}

export function DynamicPanel(props: {
	block: NoderaBlock | null;
	metaValue: string;
	updateBlock: (attributes: Record<string, unknown>) => void;
	updateMeta: (value: string) => void;
}) {
	const [value, setValue] = useState(props.metaValue || '');
	const [attribute, setAttribute] = useState('');
	const [source, setSource] = useState<SourceChoice>('post-meta');
	useEffect(() => setValue(props.metaValue || ''), [props.metaValue]);
	const supported = useMemo(() => props.block ? attributesByBlock[props.block.name] || [] : [], [props.block]);
	useEffect(() => {
		if (!supported.length) setAttribute('');
		else if (!supported.includes(attribute)) setAttribute(supported[0]);
	}, [supported.join('|'), attribute]);

	if (!props.block) return <p>{__('Select a block to connect native Block Bindings.', 'nodera')}</p>;
	if (!supported.length) {
		return <Notice status="info" isDismissible={false}>{__('This block does not expose a core binding-compatible attribute in the current Nodera UI. Gutenberg remains authoritative and third-party binding sources may still be available through WordPress.', 'nodera')}</Notice>;
	}

	const metadata = (props.block.attributes?.metadata || {}) as Record<string, unknown>;
	const bindings = ((metadata.bindings || {}) as Record<string, unknown>);
	const current = attribute ? bindings[attribute] as { source?: string; args?: Record<string, string> } | undefined : undefined;
	const metaKey = window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text';

	function connect() {
		if (!attribute) return;
		props.updateBlock({
			metadata: {
				...metadata,
				bindings: { ...bindings, [attribute]: bindingFor(source, metaKey) },
			},
		});
	}
	function disconnect() {
		if (!attribute) return;
		const next = { ...bindings };
		delete next[attribute];
		props.updateBlock({ metadata: { ...metadata, bindings: next } });
	}

	return <div className="nodera-panel">
		<Notice status="success" isDismissible={false}>{__('Dynamic Data uses WordPress Block Bindings metadata directly; Nodera does not maintain a parallel dynamic-content engine.', 'nodera')}</Notice>
		<SelectControl
			label={__('Block attribute', 'nodera')}
			value={attribute}
			options={supported.map((name) => ({ label: name, value: name }))}
			onChange={setAttribute}
		/>
		<SelectControl
			label={__('WordPress source', 'nodera')}
			value={source}
			options={[
				{ label: __('Nodera post meta', 'nodera'), value: 'post-meta' },
				{ label: __('Post publication date', 'nodera'), value: 'post-date' },
				{ label: __('Post modified date', 'nodera'), value: 'post-modified' },
				{ label: __('Post permalink', 'nodera'), value: 'post-link' },
			]}
			onChange={(next) => setSource(next as SourceChoice)}
		/>
		{source === 'post-meta' && <>
			<TextControl label={__('Nodera post-meta value', 'nodera')} value={value} onChange={setValue} />
			<Button variant="secondary" onClick={() => props.updateMeta(value)}>{__('Update post-meta source', 'nodera')}</Button>
			<p><strong>{__('Meta key', 'nodera')}:</strong> {metaKey}</p>
		</>}
		{current && <Notice status="info" isDismissible={false}>{`${__('Current binding', 'nodera')}: ${current.source || ''}`}</Notice>}
		<div className="nodera-actions">
			<Button variant="primary" onClick={connect}>{__('Connect binding', 'nodera')}</Button>
			{current && <Button variant="tertiary" onClick={disconnect}>{__('Disconnect', 'nodera')}</Button>}
		</div>
	</div>;
}
