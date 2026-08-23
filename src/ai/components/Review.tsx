import { BlockPreview } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { NoderaBlock, ValidationResponse } from '../../types';
import { materialize } from '../patch';

function printable(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'string') return value;
	return JSON.stringify(value);
}

export function Review({ response }: { response: ValidationResponse }) {
	const previewBlocks = response.candidate.map(materialize) as never[];
	return (
		<div className="nodera-review">
			<Notice status="success" isDismissible={false}>{__('Patch validated against the current target.', 'nodera')}</Notice>
			<h3>{__('Semantic diff', 'nodera')}</h3>
			{response.diff.length === 0 ? <p>{__('No structural changes.', 'nodera')}</p> : (
				<ul className="nodera-diff">
					{response.diff.map((item, index) => (
						<li key={index}>
							<strong>{printable(item.type)}</strong>{' '}
							{printable(item.blockName || item.stableId)}
							{item.property ? ` · ${printable(item.property)}: ${printable(item.before)} → ${printable(item.after)}` : ''}
						</li>
					))}
				</ul>
			)}
			<h3>{__('Quality review', 'nodera')}</h3>
			{response.quality.length === 0 ? <p>{__('No deterministic warnings detected.', 'nodera')}</p> : (
				<ul>{response.quality.map((item, index) => <li key={index}><strong>{printable(item.severity)}</strong>: {printable(item.message)}</li>)}</ul>
			)}
			<h3>{__('Candidate preview', 'nodera')}</h3>
			<div className="nodera-preview"><BlockPreview blocks={previewBlocks} viewportWidth={960} /></div>
		</div>
	);
}
