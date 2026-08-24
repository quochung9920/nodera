# Nodera

**Nodera — AI-native WordPress Builder**

Nodera runs directly inside the native WordPress block editor. Gutenberg `post_content` remains the only canonical page document; WordPress continues to own List View, block rendering, Style Engine, Global Styles, Block Bindings, Save, revisions and Undo/Redo.

## 0.1.0-rc.1 — production hardening candidate

RC1 targets WordPress 7.1+ and PHP 8.1+. WordPress 7.1 is the current public WordPress release line targeted by Nodera. The committed `build/` runtime lets WordPress users install and use Nodera without Node.js, npm or Composer.

This is a **release candidate**, not a production-certified stable release. Promotion beyond RC requires the runtime and release gates in `docs/PRODUCTION_READINESS.md`.

### Gutenberg-native UX

Select a Gutenberg block to get:

- **Nodera AI** in the native block toolbar and Block Inspector;
- **Responsive** controls that write WordPress 7.1 `style.@tablet` / `style.@mobile` states;
- **Dynamic Data** through native Block Bindings;
- **States & Effects** using native pseudo style states where Core exposes them;
- Custom CSS only as an explicit restricted fallback.

Page-level Nodera tools remain available for whole-page AI and Global Design. Base styling continues to use Gutenberg controls whenever Core already exposes the capability.

### Direct AI providers

Go to **Settings → Nodera AI** and configure OpenAI, Anthropic, Google Gemini, an OpenAI-compatible public HTTPS endpoint, or leave providers disabled and use the manual external-AI fallback.

For production deployments, credentials can be supplied from `wp-config.php` so the API key does not need to live in the WordPress database:

```php
define( 'NODERA_AI_PROVIDER', 'openai' );
define( 'NODERA_AI_MODEL', 'your-model' );
define( 'NODERA_AI_API_KEY', '...' );
// Optional for openai_compatible only:
define( 'NODERA_AI_ENDPOINT', 'https://example.com/v1/chat/completions' );
```

Before provider calls, Nodera validates the editable target, sanitizes/redacts the AI context and rate-limits direct generation. Provider HTTP uses WordPress safe-URL validation, bounded timeouts, no redirects and a bounded response size. Every provider result is untrusted until it passes the `nodera-patch/v1` validator.

### AI safety pipeline

```text
Gutenberg target
  → lazy stable IDs
  → fingerprint + editable scope
  → live Block Contracts
  → sanitized provider context
  → per-user/post generation throttle
  → provider through safe server-side HTTP
  → nodera-patch/v1
  → strict validator
  → candidate tree
  → semantic diff + quality evidence
  → preview/review
  → Apply through core/block-editor
  → native Undo / Save
```

### WordPress 7.1 native-first behavior

- new responsive styling uses the WordPress Style Engine instead of a second responsive engine;
- supported pseudo states use native `:hover`, `:focus`, `:focus-visible` and `:active` style states;
- AI authors native Core Accordion/Tabs families instead of `nodera/accordion` and `nodera/tabs`;
- old Nodera Accordion/Tabs remain hidden, legacy compatibility blocks;
- stable IDs are assigned lazily to active Nodera scopes;
- `build/editor.js` is the single production editor runtime.

## Install without Node.js

1. Download the repository ZIP from `main`, or use a packaged Nodera ZIP.
2. WordPress → **Plugins → Add Plugin → Upload Plugin**.
3. Activate Nodera. Activation blocks unsupported WordPress/PHP versions or a package missing required runtime assets.
4. Open a page in Gutenberg and select a block.
5. Configure direct AI under **Settings → Nodera AI** if desired.

Node.js and Composer are developer-only requirements.

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
