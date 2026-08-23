# Gutenberg-native UI

Nodera's primary block-level experience lives directly in Gutenberg.

## Selected block

When a Gutenberg block is selected, Nodera extends the native editor through public block-editor extension points:

- **Block Toolbar → AI** for fast AI actions on the selected subtree.
- **Block sidebar → Nodera AI** for generation, review and Apply.
- **Block sidebar → Responsive** for Tablet/Mobile overrides that Gutenberg does not natively express as per-breakpoint values.
- **Block sidebar → Dynamic Data** for native Block Bindings workflows.
- **Block sidebar → States & Effects** for bounded hover/focus/active styles and scoped Custom CSS.

Base typography, color, dimensions, spacing, alignment and layout remain in Gutenberg controls whenever Block Supports already provide them.

## Page level

The top-level Nodera PluginSidebar is page scope only: page AI, Global Design, diagnostics and manual/provider fallback. It does not replace Gutenberg's canvas, List View or settings sidebar.

## AI

The direct Generate flow calls Nodera's provider-neutral REST bridge. Provider integrations hook `nodera_ai_generate_patch` and return `nodera-patch/v1`; every result still passes scope, fingerprint, contract and candidate-tree validation before Apply.

Apply uses `core/block-editor`, does not save automatically and remains compatible with native Gutenberg Undo/Redo.

## Release runtime

Alpha `0.1.0-alpha.4` includes `build/gutenberg-native.js` so installed WordPress sites get the Gutenberg-native block controls without Node.js. The TypeScript implementation under `src/` is canonical for future builds; the supplemental runtime is a release bridge until the normal editor bundle is rebuilt from that source in the release pipeline.
