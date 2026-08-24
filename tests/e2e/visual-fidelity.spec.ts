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
}

test.describe('Nodera Visual Fidelity 2.0 acceptance', () => {
	test.skip(!baseURL || !username || !password, 'WP_BASE_URL, WP_ADMIN_USER and WP_ADMIN_PASSWORD are required for real E2E.');

	test('loads the visual runtime and resolved design context', async ({ page }) => {
		await login(page);
		await expect.poll(() => page.evaluate(() => (window as any).NoderaVisualFidelity || '')).toBe('2.0');
		const design = await page.evaluate(async () => {
			const response = await (window as any).wp.apiFetch({ path: '/nodera/v1/design-context' });
			return response;
		});
		expect(design.schema).toBe('nodera-design-context/v1');
		expect(design.theme?.stylesheet).toBeTruthy();
	});

	test('supports native Gutenberg Desktop Tablet Mobile preview switching and restoration', async ({ page }) => {
		await login(page);
		const state = await page.evaluate(async () => {
			const wp = (window as any).wp;
			const select = wp.data.select('core/editor');
			const dispatch = wp.data.dispatch('core/editor');
			const original = select.getDeviceType?.() || 'Desktop';
			const seen: string[] = [];
			for (const device of ['Desktop', 'Tablet', 'Mobile']) {
				dispatch.setDeviceType(device);
				await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
				seen.push(select.getDeviceType?.());
			}
			dispatch.setDeviceType(original);
			return { original, seen, restored: select.getDeviceType?.() };
		});
		expect(state.seen).toEqual(['Desktop', 'Tablet', 'Mobile']);
		expect(state.restored).toBe(state.original);
	});

	test('does not materialize descendant IDs merely by loading Visual Fidelity', async ({ page }) => {
		await login(page);
		const ids = await page.evaluate(() => {
			const wp = (window as any).wp;
			const child = wp.blocks.createBlock('core/paragraph', { content: 'Visual child' });
			const group = wp.blocks.createBlock('core/group', {}, [child]);
			wp.data.dispatch('core/block-editor').insertBlocks(group);
			wp.data.dispatch('core/block-editor').selectBlock(group.clientId);
			return { group: group.clientId, child: child.clientId };
		});
		await expect.poll(() => page.evaluate(({ group }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(group)?.attributes?.noderaId), ids)).toBe(true);
		await expect.poll(() => page.evaluate(({ child }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(child)?.attributes?.noderaId), ids)).toBe(false);
		await expect.poll(() => page.evaluate(() => (window as any).NoderaVisualFidelity || '')).toBe('2.0');
		await expect.poll(() => page.evaluate(({ child }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(child)?.attributes?.noderaId), ids)).toBe(false);
	});
});
