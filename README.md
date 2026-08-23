# Nodera

**Nodera — AI-native WordPress Builder**

Nodera is a professional authoring and AI safety layer that runs directly inside the native WordPress block editor. Gutenberg remains the canonical document engine: pages are ordinary Gutenberg blocks serialized in `post_content`, with native WordPress save, revisions, List View, rendering and undo/redo.

## Functional alpha

Version `0.1.0-alpha.4` ships a committed production runtime under `build/`, so WordPress users do **not** need Node.js, npm, Composer, TypeScript or Git to activate and use the plugin.

The primary UX is now Gutenberg-native:

- select a Gutenberg block and use **Nodera AI** directly from the block toolbar;
- use **Nodera AI**, **Responsive**, **Dynamic Data**, and **States & Effects** directly in the native Block settings sidebar;
- keep base typography, spacing, colors, dimensions, alignment and layout in Gutenberg's native controls whenever Gutenberg already owns that capability;
- use the top-level Nodera toolbar/sidebar only for page-level AI, Global Design and fallback workflows;
- keep Gutenberg List View, native Undo/Redo, Save/Update, revisions, block rendering, Patterns, Block Supports and normal editing behavior intact.

Included engine capabilities:

- persistent `noderaId` block identity;
- machine-readable contracts projected from the WordPress block registry;
- `nodera-ai-context/v1` and `nodera-patch/v1` with target fingerprints and scope protection;
- provider-neutral direct AI generation bridge (`nodera_ai_generate_patch`) that validates every returned patch before Apply;
- manual external-AI fallback when no direct provider bridge is configured;
- in-memory candidate trees, semantic diff, deterministic quality findings and BlockPreview review;
- responsive overrides only where Gutenberg base controls are insufficient;
- native WordPress Global Styles and native Block Bindings UX;
- state styles and restricted scoped Custom CSS;
- accessible Nodera Accordion and Tabs using the WordPress Interactivity API.

## Install without Node.js

1. Download the repository ZIP from the `main` branch, or use a packaged Nodera ZIP.
2. In WordPress go to **Plugins → Add Plugin → Upload Plugin**.
3. Upload the ZIP and activate **Nodera — AI-native WordPress Builder**.
4. Open a page in Gutenberg.
5. Select any block. Nodera controls appear in the native **Block** sidebar, and an **AI** action appears in the block toolbar.

The committed `build/` directory is the production runtime. Node.js is needed only by developers rebuilding source.

## Direct AI providers

Nodera itself remains provider-neutral. A direct provider integration hooks the WordPress filter:

```php
add_filter( 'nodera_ai_generate_patch', function ( $patch, $body, $request ) {
    // Call your trusted AI provider and return a decoded nodera-patch/v1 array.
    return $generated_patch;
}, 10, 3 );
```

If no provider bridge is configured, Nodera keeps the manual external-AI workflow as a fallback instead of silently sending page data to a third party.

## Architecture invariant

`post_content` / the Gutenberg block tree is the only canonical page document. Nodera does not maintain a parallel whole-page session, fork Gutenberg, replace WordPress revisions or render normal core blocks through a second renderer.

See `docs/ARCHITECTURE.md`, `docs/AI_ARCHITECTURE.md`, `docs/TESTING.md` and `docs/KNOWN_LIMITATIONS.md`.
