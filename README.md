# Nodera

**Nodera — AI-native WordPress Builder**

Nodera is a professional authoring and AI safety layer for the native WordPress block editor. Gutenberg remains the canonical document engine: pages are ordinary Gutenberg blocks serialized in `post_content`, with native WordPress save, revisions, rendering and undo/redo.

## Functional alpha

Version `0.1.0-alpha.3` includes a committed production runtime under `build/`, so WordPress users do **not** need Node.js, npm, Composer, TypeScript or Git to activate and use the plugin.

Included capabilities:

- persistent `noderaId` block identity;
- machine-readable contracts projected from the WordPress block registry;
- `nodera-ai-context/v1` external-AI export with scope and browser measurement state;
- `nodera-patch/v1` validation with target fingerprints and scope protection;
- in-memory candidate trees, semantic diff, deterministic quality findings and BlockPreview review;
- responsive overrides compiled to stable-ID scoped frontend CSS;
- state styles and deliberately restricted scoped Custom CSS;
- native WordPress Global Styles editing for supported color values;
- native Block Bindings UX for a safe registered post-meta source;
- accessible Nodera Accordion and Tabs using the WordPress Interactivity API;
- diagnostics, tests and installable ZIP packaging support.

## Install without Node.js

1. Download the repository ZIP from the `main` branch, or use a packaged Nodera ZIP.
2. In WordPress go to **Plugins → Add Plugin → Upload Plugin**.
3. Upload the ZIP and activate **Nodera — AI-native WordPress Builder**.
4. Open a page in the block editor and open **Nodera Studio**.

The committed `build/` directory is the production runtime. Node.js is needed only by developers who want to rebuild the TypeScript/React sources.

## Architecture invariant

`post_content` / the Gutenberg block tree is the only canonical page document. Nodera does not maintain a parallel whole-page session, fork Gutenberg, replace WordPress revisions or render normal core blocks through a second renderer.

## Developer build

```bash
npm install --package-lock-only --ignore-scripts
npm ci
composer install
npm run check:quality
vendor/bin/phpcs
vendor/bin/phpunit
npm run package
npm run verify:package
```

Real WordPress browser smoke tests read `WP_BASE_URL`, `WP_ADMIN_USER` and `WP_ADMIN_PASSWORD` from the environment; credentials are never stored in the repository.

See `docs/ARCHITECTURE.md`, `docs/AI_ARCHITECTURE.md`, `docs/TESTING.md` and `docs/KNOWN_LIMITATIONS.md`.
