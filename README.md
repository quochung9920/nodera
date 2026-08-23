# Nodera

**Nodera — AI-native WordPress Builder**

Nodera is a professional AI authoring layer for the native WordPress block editor.

## Architectural invariant

The Gutenberg block tree serialized in `post_content` is the canonical document. Nodera does **not** maintain a parallel full-document session and does not fork Gutenberg or replace WordPress block rendering.

Nodera adds persistent block identity, block contracts, scoped AI context, structured AI patches, browser-measured visual facts, responsive authoring, design and dynamic-data UX on top of native WordPress systems.

Current version: `0.1.0-alpha.1`.

See `docs/ARCHITECTURE.md` and `docs/AI_ARCHITECTURE.md`.
