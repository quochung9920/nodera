import { expect, test } from '@playwright/test';

const baseURL = process.env.WP_BASE_URL;
const username = process.env.WP_ADMIN_USER;
const password = process.env.WP_ADMIN_PASSWORD;

test.describe('Nodera local WordPress smoke', () => {
	test.skip(!baseURL || !username || !password, 'WP_BASE_URL, WP_ADMIN_USER and WP_ADMIN_PASSWORD are required for real local E2E.');

	test('integrates Nodera directly into a selected Gutenberg block', async ({ page }) => {
		await page.goto('/wp-login.php');
		await page.getByLabel(/Username|Email/i).fill(username!);
		await page.getByLabel(/Password/i).fill(password!);
		await page.getByRole('button', { name: /Log In/i }).click();
		await page.goto('/wp-admin/post-new.php?post_type=page');

		await page.waitForFunction(() => Boolean((window as any).wp?.data?.select('core/block-editor')));
		await expect.poll(() => page.evaluate(() => Boolean((window as any).NoderaNativeUI))).toBe(true);

		await page.evaluate(() => {
			const wp = (window as any).wp;
			const block = wp.blocks.createBlock('core/paragraph', { content: 'Nodera native UI smoke' });
			wp.data.dispatch('core/block-editor').insertBlocks(block);
			wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
		});

		await expect(page.getByRole('button', { name: /Nodera AI/i }).first()).toBeVisible({ timeout: 30_000 });
		await page.getByRole('button', { name: /Nodera AI/i }).first().click();
		await expect(page.getByText('What should Nodera change?', { exact: true }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Generate in Gutenberg/i }).first()).toBeVisible();
	});
});
