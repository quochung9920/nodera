# Nodera

**Nodera — AI-native WordPress Builder**

Nodera is an AI and professional-authoring layer that runs directly inside the native WordPress block editor. Gutenberg remains the canonical document engine: pages are ordinary Gutenberg blocks serialized in `post_content`, with WordPress owning Save/Update, revisions, List View, rendering and Undo/Redo.

## Alpha 0.1.0-alpha.5

Alpha.5 is a Gutenberg-native hardening release. The committed `build/` runtime can be installed on WordPress without Node.js, npm, Composer, TypeScript or Git. Developer tooling is required only when rebuilding source.

The primary UX lives inside Gutenberg:

- select a Gutenberg block and use **Nodera AI** from the native block toolbar;
- use **Nodera AI**, **Responsive**, **Dynamic Data**, and **States & Effects** inside the native Block inspector;
- use the page-level Nodera sidebar for whole-page AI and Global Design;
- keep normal Gutenberg controls as the source of truth for base typography, spacing, color, dimensions, layout, List View and block structure.

## What alpha.5 owns — and what it deliberately does not

Nodera owns:

- lazy persistent `noderaId` identity for scopes Nodera actually operates on;
- machine-readable contracts projected from the live WordPress block registry;
- `nodera-ai-context/v1` and `nodera-patch/v1`;
- target fingerprints, scope enforcement and strict untrusted-patch validation;
- provider-bound context sanitization;
- provider-neutral AI generation with optional server-side OpenAI, Anthropic, Gemini or custom HTTPS providers;
- candidate trees, semantic diff and deterministic quality findings;
- professional Gutenberg UX and compatibility fallbacks where Core is not yet sufficient.

WordPress/Gutenberg owns:

- `post_content` and the block tree;
- native Save/Update, revisions and Undo/Redo;
- Block Supports and the Style Engine;
- WordPress 7.1 responsive `style.@tablet` / `style.@mobile` states when available;
- WordPress 7.1 pseudo style states for supported blocks;
- Global Styles / `theme.json`;
- Block Bindings;
- Core Tabs and Core Accordion for new content;
- Interactivity API and normal frontend rendering.

Legacy `nodera/tabs` and `nodera/accordion` are still registered only so alpha.4 content keeps parsing. They are hidden from the inserter and are no longer AI-authorable.

## Install without Node.js

1. Download the repository ZIP from the `main` branch, or use a packaged Nodera release ZIP.
2. In WordPress go to **Plugins → Add Plugin → Upload Plugin**.
3. Upload and activate **Nodera — AI-native WordPress Builder**.
4. Open a page in Gutenberg and select a block.
5. Nodera controls appear in the native Block inspector; the block toolbar exposes **Nodera AI**.

The committed `build/` directory is the production runtime. Node.js is a developer-only dependency.

## Configure direct AI

Direct AI is optional and credentials stay on the server. Go to:

**Settings → Nodera**

Choose a provider, model and credential, then use **Save & Test Provider**. Supported built-in adapters are:

- OpenAI;
- Anthropic;
- Google Gemini;
- a custom HTTPS endpoint using the documented Nodera provider contract.

For production, prefer constants/environment-backed configuration such as `NODERA_AI_PROVIDER`, `NODERA_AI_MODEL` and `NODERA_AI_API_KEY` so credentials are not editable in wp-admin.

Trusted integrations can still override generation through `nodera_ai_generate_patch`. Regardless of provider, every returned result must pass Nodera's server-side patch validator before the editor can apply it.

## Native responsive and state behavior

On WordPress 7.1+, Nodera writes responsive values into the block's native `style.@tablet` / `style.@mobile` tree and uses native pseudo-style states where WordPress exposes them. Older alpha.4 `noderaResponsive` / `noderaStateStyles` data remains supported by a bounded compatibility compiler and can be migrated incrementally.

## Dynamic Data

Dynamic Data uses native Block Bindings metadata. The current UI exposes a safe subset of WordPress Core binding sources and the dedicated `nodera_dynamic_text` post-meta source; it does not create a parallel dynamic-data engine.

## Development and release

Source under `src/` is canonical for editor development. A clean developer build must recreate the production editor and Interactivity API modules without the removed `build/gutenberg-native.js` bridge.

Typical developer commands:

```bash
npm install
npm run check:quality
composer install
vendor/bin/phpunit
vendor/bin/phpcs
npm run package
npm run verify:package
```

Real WordPress browser acceptance uses Playwright with `WP_BASE_URL`, `WP_ADMIN_USER` and `WP_ADMIN_PASSWORD`; credentials must never be committed.

## Status

Alpha.5 is **not a stable production release** until clean CI/package gates and real WordPress browser acceptance are green. See `docs/TESTING.md`, `docs/RELEASE.md` and `docs/KNOWN_LIMITATIONS.md` for the evidence required before changing that status.

## Architecture invariant

`post_content` / the Gutenberg block tree is the only canonical page document. Nodera does not maintain a parallel whole-page session, fork Gutenberg, replace WordPress revisions, replace Gutenberg history, or render normal Core blocks through a second renderer.
