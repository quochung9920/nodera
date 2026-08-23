import type { NoderaPatch } from '../types';

export function normalizeAiResult(input: string): NoderaPatch {
	const clean = input.replace(/^\uFEFF/, '').trim();
	const fenced = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	const candidate = (fenced?.[1] || clean).trim();
	let parsed: unknown;
	try {
		parsed = JSON.parse(candidate);
	} catch {
		const start = clean.indexOf('{');
		const end = clean.lastIndexOf('}');
		if (start < 0 || end <= start) throw new Error('No valid JSON object was found in the AI response.');
		const extracted = clean.slice(start, end + 1);
		if (clean.slice(end + 1).includes('{') || clean.slice(0, start).includes('}')) {
			throw new Error('The AI response contains ambiguous JSON. Paste only one nodera-patch/v1 object.');
		}
		parsed = JSON.parse(extracted);
	}
	if (!parsed || typeof parsed !== 'object' || (parsed as { schema?: string }).schema !== 'nodera-patch/v1') {
		throw new Error('Expected nodera-patch/v1.');
	}
	return parsed as NoderaPatch;
}
