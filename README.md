# Nodera

**Nodera — AI-native WordPress Builder**

Nodera runs directly inside the native WordPress block editor. Gutenberg `post_content` remains the only canonical page document; WordPress continues to own List View, block rendering, Style Engine, Global Styles, Block Bindings, Save, revisions and Undo/Redo.

## Alpha 0.1.0-alpha.5

Alpha.5 requires WordPress 7.1+ and PHP 8.1+. The committed `build/` runtime lets WordPress users install and use Nodera without Node.js, npm or Composer.

### Gutenberg-native UX

Select a Gutenberg block to get:

- **Nodera AI** in the native block toolbar and Block Inspector;
- **Responsive** controls that write WordPress 7.1 `style.@tablet` / `style.@mobile` states;
- **Dynamic Data** through native Block Bindings;
- **States & Effects** using native pseudo style states where Core exposes them;
- Custom CSS only as an explicit restricted fallback.

Page-level Nodera tools remain available for whole-page AI and Global Design. Base styling should continue to use Gutenberg controls whenever Core already exposes the capability.

### Direct AI providers

Go to **Settings → Nodera AI** and configure one of:

- OpenAI;
- Anthropic;
- Google Gemini;
- an OpenAI-compatible HTTPS endpoint;
- or leave providers disabled and use the manual external-AI fallback.

Credentials are stored server-side in WordPress and are never sent to Gutenberg. Before provider calls, Nodera validates the editable target, sanitizes the AI context and redacts secret-like fields. Every provider result is treated as untrusted and must pass the `nodera-patch/v1` validator before Apply.

### WordPress 7.1 native-first changes

- new responsive styling uses the WordPress Style Engine instead of the old Nodera responsive data model;
- Button and Navigation Link pseudo states use native `:hover`, `:focus`, `:focus-visible` and `:active` style states;
- AI authors native Core Accordion/Tabs families instead of `nodera/accordion` and `nodera/tabs`;
- the old Nodera Accordion/Tabs remain registered only for legacy-content compatibility and are hidden from the inserter;
- stable IDs are assigned lazily to active Nodera scopes instead of dirtying every block when an old page opens;
- `build/editor.js` is again the single production editor runtime; the temporary `build/gutenberg-native.js` bridge has been removed.

### AI safety pipeline

```text
Gutenberg target
  → lazy stable IDs
  → fingerprint + scope
  → live Block Contracts
  → sanitized provider context
  → provider
  → nodera-patch/v1
  → strict validator
  → candidate tree
  → semantic diff + quality evidence
  → preview/review
  → Apply through core/block-editor
  → native Undo / Save
```

## Install without Node.js

1. Download the repository ZIP from `main`, or use a packaged Nodera ZIP.
2. WordPress → **Plugins → Add Plugin → Upload Plugin**.
3. Activate Nodera.
4. Open a page in Gutenberg and select a block.
5. Configure direct AI under **Settings → Nodera AI** if desired.

Node.js and Composer are developer-only requirements.

## Development gates

```bash
npm install
npm run check:quality
composer install
vendor/bin/phpcs
vendor/bin/phpunit
npm run package
npm run verify:package
```

Real browser E2E reads `WP_BASE_URL`, `WP_ADMIN_USER` and `WP_ADMIN_PASSWORD` from environment variables; credentials are never stored in the repository.

## Architecture invariant

Nodera does not maintain a parallel whole-page document, fork Gutenberg, replace WordPress revisions, create a second history engine or render ordinary Core blocks through a second renderer.

See `docs/ARCHITECTURE.md`, `docs/AI_ARCHITECTURE.md`, `docs/TESTING.md` and `docs/KNOWN_LIMITATIONS.md`.
