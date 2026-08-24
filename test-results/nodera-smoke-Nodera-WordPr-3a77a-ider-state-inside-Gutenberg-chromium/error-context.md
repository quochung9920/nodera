# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nodera-smoke.spec.ts >> Nodera WordPress 7.1 Gutenberg acceptance >> shows explicit provider state inside Gutenberg
- Location: tests/e2e/nodera-smoke.spec.ts:82:6

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel(/Password/i) resolved to 2 elements:
    1) <input value="" size="20" name="pwd" id="user_pass" type="password" spellcheck="false" required="required" autocomplete="current-password" class="input password-input ltr"/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" data-toggle="0" aria-label="Show password" class="button button-secondary wp-hide-pw hide-if-no-js">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - waiting for getByLabel(/Password/i)

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Log In" [level=1] [ref=e2]
  - generic [ref=e3]:
    - link "Powered by WordPress" [ref=e4] [cursor=pointer]:
      - /url: https://wordpress.org/
    - generic [ref=e5]:
      - paragraph [ref=e6]:
        - generic [ref=e7]: Username or Email Address
        - textbox "Username or Email Address" [active] [ref=e8]: nodera-verify-tmp
      - generic [ref=e9]:
        - generic [ref=e10]: Password
        - generic [ref=e11]:
          - textbox "Password" [ref=e12]
          - button "Show password" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: 
      - paragraph [ref=e15]:
        - checkbox "Remember Me" [ref=e16] [cursor=pointer]
        - generic [ref=e17]: Remember Me
        - generic [ref=e18]:
          - button "Help" [ref=e19] [cursor=pointer]:
            - generic [ref=e20]: 
          - text: 
      - paragraph:
        - button "Log In" [ref=e21] [cursor=pointer]
    - paragraph [ref=e22]:
      - link "Lost your password?" [ref=e23] [cursor=pointer]:
        - /url: http://localhost:8083/wp-login.php?action=lostpassword
    - paragraph [ref=e24]:
      - link "← Go to Nodera" [ref=e25] [cursor=pointer]:
        - /url: http://localhost:8083/
    - link "Privacy Policy" [ref=e27] [cursor=pointer]:
      - /url: http://localhost:8083/?page_id=3
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | const baseURL = process.env.WP_BASE_URL;
  4  | const username = process.env.WP_ADMIN_USER;
  5  | const password = process.env.WP_ADMIN_PASSWORD;
  6  | 
  7  | async function login(page: any) {
  8  | 	await page.goto('/wp-login.php');
  9  | 	await page.getByLabel(/Username|Email/i).fill(username!);
> 10 | 	await page.getByLabel(/Password/i).fill(password!);
     |                                     ^ Error: locator.fill: Error: strict mode violation: getByLabel(/Password/i) resolved to 2 elements:
  11 | 	await page.getByRole('button', { name: /Log In/i }).click();
  12 | 	await page.goto('/wp-admin/post-new.php?post_type=page');
  13 | 	await page.waitForFunction(() => Boolean((window as any).wp?.data?.select('core/block-editor')));
  14 | 	await expect.poll(() => page.evaluate(() => Boolean((window as any).NoderaNativeUI))).toBe(true);
  15 | }
  16 | 
  17 | test.describe('Nodera WordPress 7.1 Gutenberg acceptance', () => {
  18 | 	test.skip(!baseURL || !username || !password, 'WP_BASE_URL, WP_ADMIN_USER and WP_ADMIN_PASSWORD are required for real E2E.');
  19 | 
  20 | 	test('mounts directly on the selected Gutenberg block and assigns IDs lazily', async ({ page }) => {
  21 | 		await login(page);
  22 | 		const ids = await page.evaluate(() => {
  23 | 			const wp = (window as any).wp;
  24 | 			const first = wp.blocks.createBlock('core/paragraph', { content: 'Selected block' });
  25 | 			const second = wp.blocks.createBlock('core/paragraph', { content: 'Untouched block' });
  26 | 			wp.data.dispatch('core/block-editor').insertBlocks([first, second]);
  27 | 			wp.data.dispatch('core/block-editor').selectBlock(first.clientId);
  28 | 			return { first: first.clientId, second: second.clientId };
  29 | 		});
  30 | 		await expect(page.getByRole('button', { name: /Nodera AI/i }).first()).toBeVisible({ timeout: 30_000 });
  31 | 		await expect.poll(() => page.evaluate(({ first }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(first)?.attributes?.noderaId), ids)).toBe(true);
  32 | 		await expect.poll(() => page.evaluate(({ second }) => Boolean((window as any).wp.data.select('core/block-editor').getBlock(second)?.attributes?.noderaId), ids)).toBe(false);
  33 | 	});
  34 | 
  35 | 	test('writes responsive values to native Gutenberg style states', async ({ page }) => {
  36 | 		await login(page);
  37 | 		const clientId = await page.evaluate(() => {
  38 | 			const wp = (window as any).wp;
  39 | 			const block = wp.blocks.createBlock('core/paragraph', { content: 'Responsive smoke' });
  40 | 			wp.data.dispatch('core/block-editor').insertBlocks(block);
  41 | 			wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
  42 | 			return block.clientId;
  43 | 		});
  44 | 		await page.getByText('Responsive', { exact: true }).last().click();
  45 | 		await page.getByLabel(/Font size/i).last().fill('22px');
  46 | 		await expect.poll(() => page.evaluate((id) => (window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.style?.['@tablet']?.typography?.fontSize, clientId)).toBe('22px');
  47 | 	});
  48 | 
  49 | 	test('uses native pseudo states for Core Button and preserves native Undo', async ({ page }) => {
  50 | 		await login(page);
  51 | 		const clientId = await page.evaluate(() => {
  52 | 			const wp = (window as any).wp;
  53 | 			const button = wp.blocks.createBlock('core/button', { text: 'CTA' });
  54 | 			wp.data.dispatch('core/block-editor').insertBlocks(button);
  55 | 			wp.data.dispatch('core/block-editor').selectBlock(button.clientId);
  56 | 			return button.clientId;
  57 | 		});
  58 | 		await page.getByText('States & Effects', { exact: true }).last().click();
  59 | 		await page.getByLabel(/Background color/i).last().fill('#111111');
  60 | 		await expect.poll(() => page.evaluate((id) => (window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.style?.[':hover']?.color?.background, clientId)).toBe('#111111');
  61 | 		await page.evaluate(() => (window as any).wp.data.dispatch('core/block-editor').undo());
  62 | 		await expect.poll(() => page.evaluate((id) => (window as any).wp.data.select('core/block-editor').getBlock(id)?.attributes?.style?.[':hover']?.color?.background || '', clientId)).toBe('');
  63 | 	});
  64 | 
  65 | 	test('prefers native Core Accordion and Tabs while legacy Nodera blocks are non-insertable', async ({ page }) => {
  66 | 		await login(page);
  67 | 		const state = await page.evaluate(() => {
  68 | 			const wp = (window as any).wp;
  69 | 			return {
  70 | 				coreAccordion: Boolean(wp.blocks.getBlockType('core/accordion')),
  71 | 				coreTabs: Boolean(wp.blocks.getBlockType('core/tabs')),
  72 | 				legacyAccordionInserter: wp.blocks.getBlockType('nodera/accordion')?.supports?.inserter,
  73 | 				legacyTabsInserter: wp.blocks.getBlockType('nodera/tabs')?.supports?.inserter,
  74 | 			};
  75 | 		});
  76 | 		expect(state.coreAccordion).toBe(true);
  77 | 		expect(state.coreTabs).toBe(true);
  78 | 		expect(state.legacyAccordionInserter).toBe(false);
  79 | 		expect(state.legacyTabsInserter).toBe(false);
  80 | 	});
  81 | 
  82 | 	test('shows explicit provider state inside Gutenberg', async ({ page }) => {
  83 | 		await login(page);
  84 | 		await page.evaluate(() => {
  85 | 			const wp = (window as any).wp;
  86 | 			const block = wp.blocks.createBlock('core/paragraph', { content: 'AI smoke' });
  87 | 			wp.data.dispatch('core/block-editor').insertBlocks(block);
  88 | 			wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
  89 | 		});
  90 | 		await page.getByRole('button', { name: /Nodera AI/i }).first().click();
  91 | 		await expect(page.getByText('What should Nodera change?', { exact: true }).first()).toBeVisible();
  92 | 		await expect(page.getByRole('button', { name: /Generate in Gutenberg/i }).first()).toBeVisible();
  93 | 	});
  94 | });
  95 | 
```