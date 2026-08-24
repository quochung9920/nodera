import { normalizeAiResult } from '../../src/ai/normalizer';

describe('normalizeAiResult', () => {
	it('accepts plain nodera-patch/v1 JSON', () => {
		const result = normalizeAiResult('{"schema":"nodera-patch/v1","target":{"kind":"page","stableIds":[],"fingerprint":"x"},"operations":[]}');
		expect(result.schema).toBe('nodera-patch/v1');
	});

	it('accepts a fenced JSON result', () => {
		const result = normalizeAiResult('```json\n{"schema":"nodera-patch/v1","target":{"kind":"page","stableIds":[],"fingerprint":"x"},"operations":[]}\n```');
		expect(result.operations).toEqual([]);
	});

	it('rejects an unknown schema', () => {
		expect(() => normalizeAiResult('{"schema":"other"}')).toThrow('Expected nodera-patch/v1');
	});

	it('rejects a portable export session as an AI result', () => {
		expect(() => normalizeAiResult('{"schema":"nodera-ai-export/v1","sessionId":"nds_test"}')).toThrow('Expected nodera-patch/v1');
	});
});
