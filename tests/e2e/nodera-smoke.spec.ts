import { expect, test } from '@playwright/test';

const baseURL = process.env.WP_BASE_URL;
const username = process.env.WP_ADMIN_USER;
const password = process.env.WP_ADMIN_PASSWORD;

async function openEditor(page: any) {
	await page.goto('/wp-login.php');
	await page.getByLabel(/Username|Email/i).fill(username!);
	await page.getByLabel(/Password/i).fill(password!);
	await page.getByRole('button', { name: /Log In/i }).click();
	await page.goto('/wp-admin/post-new.php?post_type=page');
	await page.waitForFunction(() => Boolean((window as any).wp?.data?.select('core/block-editor')));
	await expect.poll(() => page.evaluate(() => Boolean((window as any).NoderaNativeUI))).toBe(true);
}

test.describe('Nodera real WordPress acceptance', () => {
	test.skip(!baseURL || !username || !password, 'WP_BASE_URL, WP_ADMIN_USER and WP_ADMIN_PASSWORD are required for real local E2E.');

	test('integrates Nodera without assigning IDs to every block on editor load or selection', async ({ page }) => {
		await openEditor(page);
		const ids = await page.evaluate(() => {
			const wp = (window as any).wp;
			const first = wp.blocks.createBlock('core/paragraph', { content: 'First untouched block' });
			const second = wp.blocks.createBlock('core/paragraph', { content: 'Selected Nodera block' });
			wp.data.dispatch('core/block-editor').insertBlocks([first, second]);
			wp.data.dispatch('core/block-editor').selectBlock(second.clientId);
			return [first.clientId, second.clientId];
		});

		await expect(page.getByRole('button', { name: /Nodera AI/i }).first()).toBeVisible({ timeout: 30_000 });
		const noderaIds = await page.evaluate((clientIds) => {
			const store = (window as any).wp.data.select('core/block-editor');
			return clientIds.map((clientId: string) => store.getBlock(clientId)?.attributes?.noderaId ?? null);
		}, ids);
		expect(noderaIds).toEqual([null, null]);
	});

	test('writes responsive overrides through native Gutenberg style states and participates in Undo', async ({ page }) => {
		await openEditor(page);
		const clientId = await page.evaluate(() => {
			const wp = (window as any).wp;
			const block = wp.blocks.createBlock('core/paragraph', { content: 'Responsive paragraph' });
			wp.data.dispatch('core/block-editor').insertBlocks(block);
			wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
			return block.clientId;
		});

		const native = await page.evaluate(() => Boolean((window as any).NoderaSettings?.nativeResponsive));
		test.skip(!native, 'Native responsive style states require WordPress 7.1+.');

		await page.getByRole('button', { name: /^Responsive$/ }).last().click();
		const padding = page.getByLabel(/Padding top|paddingTop/i).last();
		await expect(padding).toBeVisible();
		await padding.fill('2rem');

		await expect.poll(() => page.evaluate((id) => {
			const block = (window as any).wp.data.select('core/block-editor').getBlock(id);
			return block?.attributes?.style?.['@tablet']?.spacing?.padding?.top ?? '';
		}, clientId)).toBe('2rem');

		await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
		await expect.poll(() => page.evaluate((id) => {
			const block = (window as any).wp.data.select('core/block-editor').getBlock(id);
			return block?.attributes?.style?.['@tablet']?.spacing?.padding?.top ?? '';
		}, clientId)).toBe('');
	});

	test('retires legacy Nodera interaction blocks and prefers WordPress Core blocks', async ({ page }) => {
		await openEditor(page);
		const state = await page.evaluate(() => {
			const wp = (window as any).wp;
			return {
				legacyTabsInserter: wp.blocks.getBlockType('nodera/tabs')?.supports?.inserter,
				legacyAccordionInserter: wp.blocks.getBlockType('nodera/accordion')?.supports?.inserter,
				coreTabs: Boolean(wp.blocks.getBlockType('core/tabs')),
				coreAccordion: Boolean(wp.blocks.getBlockType('core/accordion')),
				wordpress: (window as any).NoderaSettings?.wordpress || '',
			};
		});
		expect(state.legacyTabsInserter).toBe(false);
		expect(state.legacyAccordionInserter).toBe(false);
		if (Number.parseFloat(state.wordpress) >= 7.1) {
			expect(state.coreTabs).toBe(true);
			expect(state.coreAccordion).toBe(true);
		}
	});
});
