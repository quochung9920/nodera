import { expect, test } from '@playwright/test';

const baseURL = process.env.WP_BASE_URL;
const username = process.env.WP_ADMIN_USER;
const password = process.env.WP_ADMIN_PASSWORD;

test.describe('Nodera local WordPress smoke', () => {
	test.skip(!baseURL || !username || !password, 'WP_BASE_URL, WP_ADMIN_USER and WP_ADMIN_PASSWORD are required for real local E2E.');

	test('logs in and exposes Nodera Studio in Gutenberg', async ({ page }) => {
		await page.goto('/wp-login.php');
		await page.getByLabel(/Username|Email/i).fill(username!);
		await page.getByLabel(/Password/i).fill(password!);
		await page.getByRole('button', { name: /Log In/i }).click();
		await page.goto('/wp-admin/post-new.php?post_type=page');
		await expect(page.getByText('Nodera Studio', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
	});
});
