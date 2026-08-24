import { expect, test } from '@playwright/test';

const baseURL = process.env.WP_BASE_URL;
const username = process.env.WP_ADMIN_USER;
const password = process.env.WP_ADMIN_PASSWORD;

async function login(page: any) {
	await page.goto('/wp-login.php');
	await page.locator('#user_login').fill(username!);
	await page.locator('#user_pass').fill(password!);
	await page.locator('#wp-submit').click();
	await page.waitForURL(/\/wp-admin\//, { timeout: 30_000 });
	await page.goto('/wp-admin/post-new.php?post_type=page');
	await page.waitForFunction(() => Boolean((window as any).wp?.data?.select('core/block-editor')));
	await expect.poll(() => page.evaluate(() => Boolean((window as any).NoderaNativeUI))).toBe(true);
}

test.describe('Nodera WordPress 7.1 Gutenberg acceptance', () => {
	test.skip(!baseURL || !username || !password, 'WP_BASE_URL, WP_ADMIN_USER and WP_ADMIN_PASSWORD are required for real E2E.');

	test('mounts directly on the selected Gutenberg block and assigns IDs lazily', async ({ page }) => {
		await login(page);
		const ids = await page.evaluate(() => {
			const wp = (window as any).wp;
			const first = wp.blocks.createBlock('core/paragraph', { content: 'Selected block' });
			const second = wp.blocks.createBlock('core/paragraph', { content: 'Untouched block' });
			wp.data.dispatch('core/block-editor').insertBlocks([first, second]);
			wp.data.dispatch('core/block-editor').selectBlock(first.clientId);
			return { first: first.clientId, second: second.clientId };
		});
		await expect(page.getByRole('button', { name: /Nodera AI/i }).first()).toBeVisible({ timeout: 30_000 });
		await expect.poll(() => page.evaluate(({ first }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(first)?.attributes?.noderaId), ids)).toBe(true);
		await expect.poll(() => page.evaluate(({ second }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(second)?.attributes?.noderaId), ids)).toBe(false);
	});

	test('writes responsive values to native Gutenberg style states', async ({ page }) => {
		await login(page);
		const clientId = await page.evaluate(() => {
			const wp = (window as any).wp;
			const block = wp.blocks.createBlock('core/paragraph', { content: 'Responsive smoke' });
			wp.data.dispatch('core/block-editor').insertBlocks(block);
			wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
			return block.clientId;
		});
		await page.getByText('Responsive', { exact: true }).last().click();
		await page.getByLabel(/Font size/i).last().fill('22px');
		await expect.poll(() => page.evaluate((id) => (window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.style?.['@tablet']?.typography?.fontSize, clientId)).toBe('22px');
	});

	test('uses native pseudo states for Core Button and preserves native Undo', async ({ page }) => {
		await login(page);
		const clientId = await page.evaluate(() => {
			const wp = (window as any).wp;
			const button = wp.blocks.createBlock('core/button', { text: 'CTA' });
			wp.data.dispatch('core/block-editor').insertBlocks(button);
			wp.data.dispatch('core/block-editor').selectBlock(button.clientId);
			return button.clientId;
		});
		await page.getByText('States & Effects', { exact: true }).last().click();
		await page.getByLabel(/Background color/i).last().fill('#111111');
		await expect.poll(() => page.evaluate((id) => (window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.style?.[':hover']?.color?.background, clientId)).toBe('#111111');
		await page.evaluate(() => (window as any).wp.data.dispatch('core/block-editor').undo());
		await expect.poll(() => page.evaluate((id) => (window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.style?.[':hover']?.color?.background || '', clientId)).toBe('');
	});

	test('prefers native Core Accordion and Tabs while legacy Nodera blocks are non-insertable', async ({ page }) => {
		await login(page);
		const state = await page.evaluate(() => {
			const wp = (window as any).wp;
			return {
				coreAccordion: Boolean(wp.blocks.getBlockType('core/accordion')),
				coreTabs: Boolean(wp.blocks.getBlockType('core/tabs')),
				legacyAccordionInserter: wp.blocks.getBlockType('nodera/accordion')?.supports?.inserter,
				legacyTabsInserter: wp.blocks.getBlockType('nodera/tabs')?.supports?.inserter,
			};
		});
		expect(state.coreAccordion).toBe(true);
		expect(state.coreTabs).toBe(true);
		expect(state.legacyAccordionInserter).toBe(false);
		expect(state.legacyTabsInserter).toBe(false);
	});

	test('shows explicit provider state inside Gutenberg', async ({ page }) => {
		await login(page);
		await page.evaluate(() => {
			const wp = (window as any).wp;
			const block = wp.blocks.createBlock('core/paragraph', { content: 'AI smoke' });
			wp.data.dispatch('core/block-editor').insertBlocks(block);
			wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
		});
		await page.getByRole('button', { name: /Nodera AI/i }).first().click();
		await expect(page.getByText('What should Nodera change?', { exact: true }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Generate in Gutenberg/i }).first()).toBeVisible();
	});
});
