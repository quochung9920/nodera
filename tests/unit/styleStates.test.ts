import { getStyleValue, migrateLegacyResponsive, responsivePath, setStyleValue } from '../../src/gutenberg/styleStates';

describe('native Gutenberg style state helpers', () => {
	it('writes responsive values without mutating the base style', () => {
		const base = { color: { text: '#111111' } };
		const next = setStyleValue(base, responsivePath('mobile', 'fontSize')!, '1rem');
		expect(next).toEqual({ color: { text: '#111111' }, '@mobile': { typography: { fontSize: '1rem' } } });
		expect(base).toEqual({ color: { text: '#111111' } });
	});

	it('prunes a cleared state value', () => {
		const style = { '@tablet': { spacing: { padding: { top: '2rem' } } } };
		const next = setStyleValue(style, ['@tablet', 'spacing', 'padding', 'top'], '');
		expect(next).toEqual({});
	});

	it('migrates alpha.4 responsive fields into native style states', () => {
		const next = migrateLegacyResponsive({}, {
			tablet: { paddingTop: '2rem', gap: '1rem' },
			mobile: { fontSize: '1.25rem' },
		});
		expect(getStyleValue(next, ['@tablet', 'spacing', 'padding', 'top'])).toBe('2rem');
		expect(getStyleValue(next, ['@tablet', 'spacing', 'blockGap'])).toBe('1rem');
		expect(getStyleValue(next, ['@mobile', 'typography', 'fontSize'])).toBe('1.25rem');
	});
});
