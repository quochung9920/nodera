# Nodera

**Nodera — AI-native WordPress Builder**

Nodera runs directly inside the native WordPress block editor. Gutenberg `post_content` remains the only canonical page document; WordPress continues to own List View, block rendering, Style Engine, Global Styles, Block Bindings, Save, revisions and Undo/Redo.

## 0.1.0-rc.2 — portable AI release candidate

RC2 targets WordPress 7.1+ and PHP 8.1+. The committed `build/` runtime lets WordPress users install and use Nodera without Node.js, npm, Composer or an AI API key.

This is a **release candidate**, not a production-certified stable release. Promotion beyond RC requires the runtime and release gates in `docs/PRODUCTION_READINESS.md`.

### Gutenberg-native UX

Select a Gutenberg block to get:

- **Nodera AI** in the native block toolbar and Block Inspector;
- **Responsive** controls that write WordPress 7.1 `style.@tablet` / `style.@mobile` states;
- **Dynamic Data** through native Block Bindings;
- **States & Effects** using native pseudo style states where Core exposes them;
- Custom CSS only as an explicit restricted fallback.

Page-level Nodera tools remain available for whole-page AI and Global Design. Base styling continues to use Gutenberg controls whenever Core already exposes the capability.

## Primary AI workflow: export → external AI → import

Nodera does **not require an API key** for its primary AI workflow.

1. Select a Gutenberg block, selected subtree, or whole page.
2. Enter an optional task.
3. Use **Copy for AI**, **Download Session JSON**, or **Download Prompt**.
4. Send the portable `nodera-ai-export/v1` session to ChatGPT, Claude, Gemini, Codex, a local model, or any other AI capable of returning JSON.
5. The external AI returns exactly one `nodera-patch/v1` object.
6. Paste or upload that JSON under **Import AI Result**.
7. Nodera validates fingerprint, editable scope, block contracts, attributes, URLs/CSS and candidate structure.
8. Review semantic diff and quality findings.
9. Click **Apply to Gutenberg**. Native Gutenberg Undo/Redo and Save/Update remain in control.

Portable sessions are temporary AI context, never a second page/document engine. The server sanitizes and redacts the export before it leaves WordPress.

```text
Gutenberg target
  → lazy stable IDs
  → fingerprint + editable scope
  → live Block Contracts
  → server-side context sanitizer/redaction
  → nodera-ai-export/v1
  → external AI of your choice
  → nodera-patch/v1
  → strict server validator
  → candidate tree
  → semantic diff + quality evidence
  → explicit Apply through core/block-editor
  → native Undo / Save / revisions
```

### Export scopes

- **Selected block only** — only the selected block is editable; descendants remain contextual/read-only.
- **Selected block + inner blocks** — the complete selected Gutenberg subtree is editable.
- **Whole page** — the document root is editable from the page-level Nodera panel.

Block-only exports assign a persistent ID only to the selected root. Descendant IDs are materialized only when a subtree/page export actually needs them.

### Optional direct AI providers

Direct OpenAI, Anthropic, Google Gemini and OpenAI-compatible integrations remain available under **Settings → Nodera AI**, but they are optional and collapsed behind the portable workflow in the editor.

For deployments that choose direct generation, credentials can be supplied from `wp-config.php` so an API key does not need to live in the WordPress database:

```php
define( 'NODERA_AI_PROVIDER', 'openai' );
define( 'NODERA_AI_MODEL', 'your-model' );
define( 'NODERA_AI_API_KEY', '...' );
// Optional for openai_compatible only:
define( 'NODERA_AI_ENDPOINT', 'https://example.com/v1/chat/completions' );
```

Direct provider HTTP remains rate-limited, server-side, safe-URL validated and untrusted until the same `nodera-patch/v1` validator succeeds.

### WordPress 7.1 native-first behavior

- new responsive styling uses the WordPress Style Engine instead of a second responsive engine;
- supported pseudo states use native `:hover`, `:focus`, `:focus-visible` and `:active` style states;
- AI authors native Core Accordion/Tabs families instead of `nodera/accordion` and `nodera/tabs`;
- old Nodera Accordion/Tabs remain hidden, legacy compatibility blocks;
- stable IDs are assigned lazily to the exact active Nodera scope;
- `build/editor.js` is the single production editor runtime.

## Install without Node.js

1. Download the repository ZIP from `main`, or use a packaged Nodera ZIP.
2. WordPress → **Plugins → Add Plugin → Upload Plugin**.
3. Activate Nodera. Activation blocks unsupported WordPress/PHP versions or a package missing required runtime assets.
4. Open a page in Gutenberg and select a block.
5. Export the block/subtree/page for your preferred external AI, then import the returned patch.

Node.js, Composer and AI API keys are not required for end users using portable AI sessions.

## Development and release gates

```bash
npm install
npm run release:verify
composer install
vendor/bin/phpcs
vendor/bin/phpunit
```

`npm run package` creates `dist/nodera-<version>.zip` plus a SHA-256 checksum. `npm run verify:package` verifies version synchronization, required runtime/release files and checksum integrity.

Real browser E2E reads `WP_BASE_URL`, `WP_ADMIN_USER` and `WP_ADMIN_PASSWORD` from environment variables; credentials are never stored in the repository.

## Architecture invariant

Nodera does not maintain a parallel whole-page document, fork Gutenberg, replace WordPress revisions, create a second history engine or render ordinary Core blocks through a second renderer.

See `docs/ARCHITECTURE.md`, `docs/AI_ARCHITECTURE.md`, `docs/TESTING.md`, `docs/PRODUCTION_READINESS.md`, `docs/KNOWN_LIMITATIONS.md` and `SECURITY.md`.
