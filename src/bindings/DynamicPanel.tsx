import { Button, Notice, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import type { NoderaBlock } from '../types';

const supportedAttributes: Record<string, string[]> = {
	'core/image': ['id', 'url', 'title', 'alt', 'caption'],
	'core/heading': ['content'],
	'core/paragraph': ['content'],
	'core/button': ['url', 'text', 'linkTarget', 'rel'],
	'core/navigation-link': ['url'],
	'core/navigation-submenu': ['url'],
	'core/post-date': ['datetime'],
};

export function DynamicPanel(props: {
	block: NoderaBlock | null;
	metaValue: string;
	updateBlock: (attributes: Record<string, unknown>) => void;
	updateMeta: (value: string) => void;
}) {
	const [value, setValue] = useState(props.metaValue || '');
	const [attribute, setAttribute] = useState('content');
	const [source, setSource] = useState('meta');
	const attrs = useMemo(() => props.block ? (supportedAttributes[props.block.name] || []) : [], [props.block?.name]);
	if (!props.block) return <p>{__('Select a block to connect dynamic data.', 'nodera')}</p>;
	if (!attrs.length) return <Notice status="info" isDismissible={false}>{__('This block does not currently expose a Core Block Bindings attribute.', 'nodera')}</Notice>;
	const selectedAttribute = attrs.includes(attribute) ? attribute : attrs[0];
	const metadata = (props.block.attributes?.metadata || {}) as Record<string, any>;
	const bindings = (metadata.bindings || {}) as Record<string, any>;
	const connected = Boolean(bindings[selectedAttribute]);

	function declaration() {
		if (source === 'meta') return { source: 'core/post-meta', args: { key: window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text' } };
		if (source === 'date') return { source: 'core/post-data', args: { field: 'date' } };
		if (source === 'modified') return { source: 'core/post-data', args: { field: 'modified' } };
		return { source: 'core/post-data', args: { field: 'link' } };
	}
	function connect() {
		props.updateBlock({ metadata: { ...metadata, bindings: { ...bindings, [selectedAttribute]: declaration() } } });
	}
	function disconnect() {
		const next = { ...bindings }; delete next[selectedAttribute];
		props.updateBlock({ metadata: { ...metadata, bindings: next } });
	}
	return <div className="nodera-panel">
		<Notice status="info" isDismissible={false}>{__('Uses the native WordPress Block Bindings API. The binding lives in block metadata, not in a Nodera document.', 'nodera')}</Notice>
		<SelectControl label={__('Bound attribute', 'nodera')} value={selectedAttribute} options={attrs.map((name)=>({label:name,value:name}))} onChange={setAttribute} />
		<SelectControl label={__('Source', 'nodera')} value={source} options={[
			{label:__('Nodera safe post meta', 'nodera'),value:'meta'},
			{label:__('Post publication date', 'nodera'),value:'date'},
			{label:__('Post modified date', 'nodera'),value:'modified'},
			{label:__('Post permalink', 'nodera'),value:'link'},
		]} onChange={setSource} />
		{source === 'meta' && <><TextControl label={__('Post-meta value', 'nodera')} value={value} onChange={setValue} /><Button variant="secondary" onClick={() => props.updateMeta(value)}>{__('Update source value', 'nodera')}</Button></>}
		{connected ? <Button variant="tertiary" onClick={disconnect}>{__('Disconnect attribute', 'nodera')}</Button> : <Button variant="primary" onClick={connect}>{__('Connect dynamic data', 'nodera')}</Button>}
	</div>;
}
