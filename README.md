# Nodera

**Nodera — AI-native WordPress Builder**

Nodera is a professional authoring and AI safety layer for the native WordPress block editor. Gutenberg remains the canonical document engine: pages are ordinary Gutenberg blocks serialized in `post_content`, with native WordPress save, revisions, rendering and undo/redo.

## Functional alpha

Version `0.1.0-alpha.2` includes:

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
- diagnostics, PHPUnit/Jest-style unit tests, Playwright local smoke harness and installable ZIP packaging.

## Architecture invariant

`post_content` / the Gutenberg block tree is the only canonical page document. Nodera does not maintain a parallel whole-page session, fork Gutenberg, replace WordPress revisions or render normal core blocks through a second renderer.

## Development

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
