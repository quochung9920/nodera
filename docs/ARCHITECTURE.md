# Architecture

## Canonical document

WordPress `post_content` and its Gutenberg block tree are the only canonical page document. Nodera does not store a parallel full-document session.

## Gutenberg is the engine

Nodera is implemented as a Gutenberg extension, not a replacement editor.

- Gutenberg owns block editing, selection, insertion, movement, List View, history, Save/Update, revisions and normal block rendering.
- Native Block Supports remain the first choice for base typography, spacing, dimensions, color, layout and alignment.
- Nodera extends selected blocks through public Gutenberg integration points such as `editor.BlockEdit`, `BlockControls` and `InspectorControls`.
- Block-level Nodera UI lives in the native block toolbar and Block settings sidebar.
- The top-level Nodera PluginSidebar is reserved for page-level AI, Global Design and fallback/diagnostic workflows.

## Ownership

- The WordPress block registry / `block.json` owns block schemas and capabilities.
- Global Styles / `theme.json` owns global design persistence.
- Block Bindings owns dynamic attribute connections.
- The Interactivity API owns Nodera block frontend interactions.
- Nodera owns stable AI identity, bounded responsive overrides, scoped state/CSS, AI context/patch validation, diff/review and professional UX where Gutenberg does not already provide the capability.

## AI apply path

AI never writes a separate Nodera page model. Validated operations resolve persistent `noderaId` values to current Gutenberg `clientId` values and dispatch through `core/block-editor`. Apply leaves the post dirty and does not auto-save, so native Gutenberg Undo and WordPress Save/Update remain authoritative.

Direct generation is provider-neutral. A trusted integration may hook `nodera_ai_generate_patch`; the returned patch must still pass Nodera fingerprint, scope, contract and candidate-tree validation. With no provider bridge configured, the manual external-AI exchange remains an explicit fallback.

## Composition root

`nodera.php` performs requirements/autoload/bootstrap only. `Nodera\Plugin` registers the identity, contracts, responsive, bindings, blocks, editor integration and REST modules.

## Rendering

Nodera does not render ordinary Gutenberg pages through a custom renderer. `WP_HTML_Tag_Processor` adds a safe `data-nodera-id` to rendered block roots where possible. Responsive/state CSS uses that persistent selector while ordinary block rendering remains WordPress-native.
