import { Button, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { NoderaBlock } from '../types';

export function DynamicPanel(props: {
	block: NoderaBlock | null;
	metaValue: string;
	updateBlock: (attributes: Record<string, unknown>) => void;
	updateMeta: (value: string) => void;
}) {
	const [value, setValue] = useState(props.metaValue || '');
	if (!props.block) return <p>{__('Select a Heading or Paragraph to connect dynamic data.', 'nodera')}</p>;
	const supported = ['core/heading', 'core/paragraph'].includes(props.block.name);
	if (!supported) return <Notice status="info" isDismissible={false}>{__('The first Nodera binding workflow supports Heading and Paragraph content.', 'nodera')}</Notice>;
	const metadata = (props.block.attributes?.metadata || {}) as Record<string, unknown>;
	const bindings = ((metadata.bindings || {}) as Record<string, unknown>);
	const connected = Boolean(bindings.content);
	function connect() {
		props.updateBlock({ metadata: { ...metadata, bindings: { ...bindings, content: { source: 'core/post-meta', args: { key: window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text' } } } } });
	}
	function disconnect() {
		const next = { ...bindings };
		delete next.content;
		props.updateBlock({ metadata: { ...metadata, bindings: next } });
	}
	return <div className="nodera-panel">
		<TextControl label={__('Dynamic post-meta value', 'nodera')} value={value} onChange={setValue} />
		<Button variant="secondary" onClick={() => props.updateMeta(value)}>{__('Update source value', 'nodera')}</Button>
		<p><strong>{__('Source', 'nodera')}:</strong> core/post-meta · {window.NoderaSettings?.dynamicMeta}</p>
		{connected ? <Button variant="tertiary" onClick={disconnect}>{__('Disconnect content', 'nodera')}</Button> : <Button variant="primary" onClick={connect}>{__('Connect content', 'nodera')}</Button>}
	</div>;
}
