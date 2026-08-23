import { flattenBlocks, ID_RE, newStableId } from '../../src/identity';

describe('Nodera identity helpers', () => {
	it('creates valid persistent IDs', () => {
		expect(newStableId()).toMatch(ID_RE);
	});

	it('flattens nested block trees', () => {
		const blocks: any = [{ clientId: 'a', name: 'core/group', attributes: {}, innerBlocks: [{ clientId: 'b', name: 'core/paragraph', attributes: {}, innerBlocks: [] }] }];
		expect(flattenBlocks(blocks).map((block) => block.clientId)).toEqual(['a', 'b']);
	});
});
