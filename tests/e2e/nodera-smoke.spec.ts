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

async function insertSelectedParagraph(page: any, content = 'Portable AI smoke') {
	return page.evaluate((text: string) => {
		const wp = (window as any).wp;
		const block = wp.blocks.createBlock('core/paragraph', { content: text });
		wp.data.dispatch('core/block-editor').insertBlocks(block);
		wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
		return block.clientId;
	}, content);
}

async function openNoderaAi(page: any) {
	const button = page.getByRole('button', { name: /Nodera AI/i }).first();
	await expect(button).toBeVisible({ timeout: 30_000 });
	await button.click();
	await expect(page.getByText(/No API key is required/i).first()).toBeVisible();
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

	test('keeps descendants untouched for selected-block identity until subtree export is requested', async ({ page }) => {
		await login(page);
		const ids = await page.evaluate(() => {
			const wp = (window as any).wp;
			const child = wp.blocks.createBlock('core/paragraph', { content: 'Child' });
			const group = wp.blocks.createBlock('core/group', {}, [child]);
			wp.data.dispatch('core/block-editor').insertBlocks(group);
			wp.data.dispatch('core/block-editor').selectBlock(group.clientId);
			return { group: group.clientId, child: child.clientId };
		});
		await expect(page.getByRole('button', { name: /Nodera AI/i }).first()).toBeVisible({ timeout: 30_000 });
		await expect.poll(() => page.evaluate(({ group }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(group)?.attributes?.noderaId), ids)).toBe(true);
		await expect.poll(() => page.evaluate(({ child }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(child)?.attributes?.noderaId), ids)).toBe(false);
	});

	test('writes responsive values to native Gutenberg style states', async ({ page }) => {
		await login(page);
		const clientId = await insertSelectedParagraph(page, 'Responsive smoke');
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

	test('exposes portable export/import and protocol integrity without requiring a provider', async ({ page }) => {
		await login(page);
		await insertSelectedParagraph(page);
		await openNoderaAi(page);
		await expect(page.getByRole('button', { name: /Copy for AI/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Download Session JSON/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Download Prompt/i }).first()).toBeVisible();
		await expect(page.getByText('Import AI Result', { exact: true }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Validate & Preview/i }).first()).toBeVisible();
		const responsePromise = page.waitForResponse((response) => response.url().includes('/wp-json/nodera/v1/ai/export') && response.request().method() === 'POST');
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: /Download Session JSON/i }).first().click();
		const response = await responsePromise;
		await downloadPromise;
		const session = await response.json();
		expect(session.schema).toBe('nodera-ai-export/v1');
		expect(session.protocol?.version).toBe('1.0');
		expect(session.integrity?.algorithm).toBe('sha256');
		expect(session.integrity?.value).toMatch(/^[a-f0-9]{64}$/);
		await expect(page.getByText(/Protocol/i).first()).toBeVisible();
	});

	test('detects a stale exported session before server validation or Apply', async ({ page }) => {
		await login(page);
		const clientId = await insertSelectedParagraph(page, 'Original portable content');
		await openNoderaAi(page);
		const responsePromise = page.waitForResponse((response) => response.url().includes('/wp-json/nodera/v1/ai/export') && response.request().method() === 'POST');
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: /Download Session JSON/i }).first().click();
		const session = await (await responsePromise).json();
		await downloadPromise;
		await page.evaluate((id) => (window as any).wp.data.dispatch('core/block-editor').updateBlockAttributes(id, { content: 'Changed after export' }), clientId);
		const stalePatch = {
			schema: 'nodera-patch/v1',
			target: session.target,
			operations: [],
		};
		await page.getByLabel(/Paste nodera-patch\/v1 JSON/i).first().fill(JSON.stringify(stalePatch));
		await page.getByRole('button', { name: /Validate & Preview/i }).first().click();
		await expect(page.getByText(/Conflict detected/i).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Export Fresh Session/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /Discard Imported Result/i }).first()).toBeVisible();
	});

	test('keeps large documents lazy when selecting one block', async ({ page }) => {
		await login(page);
		const firstId = await page.evaluate(() => {
			const wp = (window as any).wp;
			const blocks = Array.from({ length: 100 }, (_, index) => wp.blocks.createBlock('core/paragraph', { content: `Performance block ${index + 1}` }));
			wp.data.dispatch('core/block-editor').insertBlocks(blocks);
			wp.data.dispatch('core/block-editor').selectBlock(blocks[0].clientId);
			return blocks[0].clientId;
		});
		await expect(page.getByRole('button', { name: /Nodera AI/i }).first()).toBeVisible({ timeout: 30_000 });
		await expect.poll(() => page.evaluate((id) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.noderaId), firstId)).toBe(true);
		await expect.poll(() => page.evaluate(() => {
			const blocks = (window as any).wp.data.select('core/block-editor').getBlocks();
			return blocks.filter((block: any) => Boolean(block.attributes?.noderaId)).length;
		})).toBe(1);
	});

	test('opens the selected-block AI popover with keyboard semantics', async ({ page }) => {
		await login(page);
		await insertSelectedParagraph(page, 'Keyboard accessibility');
		const button = page.getByRole('button', { name: /Nodera AI/i }).first();
		await button.focus();
		await expect(button).toBeFocused();
		await button.press('Enter');
		await expect(page.getByText(/No API key is required/i).first()).toBeVisible();
		await expect(page.getByLabel(/Paste nodera-patch\/v1 JSON/i).first()).toBeVisible();
		await expect(page.getByLabel(/Or upload AI result JSON/i).first()).toBeVisible();
	});

	test('publishes only detected native dynamic binding adapters', async ({ page }) => {
		await login(page);
		const sources = await page.evaluate(() => (window as any).NoderaSettings?.dynamicSources || []);
		expect(Array.isArray(sources)).toBe(true);
		expect(sources.some((source: any) => source.id === 'core/post-meta' && source.available)).toBe(true);
		expect(sources.some((source: any) => source.id === 'core/post-data' && source.available)).toBe(true);
	});
});
