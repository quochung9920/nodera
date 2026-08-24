import { BlockPreview } from '@wordpress/block-editor';
import { Notice, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { NoderaBlock, ValidationResponse } from '../../types';
import { materialize } from '../patch';

function printable(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'string') return value;
	return JSON.stringify(value);
}

function summary(diff: Array<Record<string, unknown>>) {
	const counts = { inserted: 0, removed: 0, moved: 0, replaced: 0, attribute: 0 };
	for (const item of diff) {
		const type = String(item.type || '') as keyof typeof counts;
		if (type in counts) counts[type] += 1;
	}
	return counts;
}

export function Review({ response, baseline = [] }: { response: ValidationResponse; baseline?: NoderaBlock[] }) {
	const [viewportWidth, setViewportWidth] = useState('960');
	const previewBlocks = response.candidate.map(materialize) as never[];
	const baselineBlocks = baseline.map(materialize) as never[];
	const counts = summary(response.diff);
	const qualityErrors = response.quality.filter((item) => ['error', 'critical'].includes(String(item.severity || '').toLowerCase())).length;
	return (
		<section className="nodera-review" aria-labelledby="nodera-review-heading">
			<h3 id="nodera-review-heading">{__('AI change review', 'nodera')}</h3>
			<Notice status={qualityErrors ? 'warning' : 'success'} isDismissible={false}>
				{qualityErrors ? __('Patch is structurally valid but has blocking deterministic quality findings.', 'nodera') : __('Patch validated against the current Gutenberg target.', 'nodera')}
			</Notice>

			<div className="nodera-diff-summary" role="group" aria-label={__('Change summary', 'nodera')}>
				<span><strong>{counts.inserted}</strong> {__('added', 'nodera')}</span>
				<span><strong>{counts.removed}</strong> {__('removed', 'nodera')}</span>
				<span><strong>{counts.moved}</strong> {__('moved', 'nodera')}</span>
				<span><strong>{counts.replaced}</strong> {__('replaced', 'nodera')}</span>
				<span><strong>{counts.attribute}</strong> {__('attribute changes', 'nodera')}</span>
			</div>

			<h4>{__('Semantic diff', 'nodera')}</h4>
			{response.diff.length === 0 ? <p>{__('No structural or attribute changes.', 'nodera')}</p> : (
				<ul className="nodera-diff">
					{response.diff.map((item, index) => (
						<li key={index} className={`nodera-diff-${String(item.type || 'change')}`}>
							<strong>{printable(item.type)}</strong>{' '}
							{printable(item.blockName || item.stableId || item.from || item.to)}
							{item.property ? ` · ${printable(item.property)}: ${printable(item.before)} → ${printable(item.after)}` : ''}
						</li>
					))}
				</ul>
			)}

			<h4>{__('Quality review', 'nodera')}</h4>
			{response.quality.length === 0 ? <p>{__('No deterministic warnings detected.', 'nodera')}</p> : (
				<ul className="nodera-quality-list">{response.quality.map((item, index) => <li key={index} data-severity={printable(item.severity)}><strong>{printable(item.severity)}</strong>: {printable(item.message)}</li>)}</ul>
			)}

			<h4>{__('Responsive preview', 'nodera')}</h4>
			<SelectControl
				label={__('Preview viewport', 'nodera')}
				value={viewportWidth}
				options={[
					{ label: __('Mobile · 320px', 'nodera'), value: '320' },
					{ label: __('Tablet · 768px', 'nodera'), value: '768' },
					{ label: __('Desktop · 1280px', 'nodera'), value: '1280' },
				]}
				onChange={setViewportWidth}
			/>
			<div className="nodera-preview-compare">
				<div className="nodera-preview-column">
					<h5>{__('Before', 'nodera')}</h5>
					<div className="nodera-preview">{baselineBlocks.length ? <BlockPreview blocks={baselineBlocks} viewportWidth={Number(viewportWidth)} /> : <p>{__('Baseline preview unavailable for this result.', 'nodera')}</p>}</div>
				</div>
				<div className="nodera-preview-column">
					<h5>{__('After', 'nodera')}</h5>
					<div className="nodera-preview"><BlockPreview blocks={previewBlocks} viewportWidth={Number(viewportWidth)} /></div>
				</div>
			</div>
		</section>
	);
}
