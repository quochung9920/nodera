# Architecture

## Canonical document

WordPress `post_content` and its Gutenberg block tree are the only canonical page document. Nodera does not store a parallel full-document session.

Portable `nodera-ai-export/v1` files are temporary transport context for an external AI. They are never loaded as a second canonical editor document and never own Save, history or revisions.

## Gutenberg is the engine

Nodera is implemented as a Gutenberg extension, not a replacement editor.

- Gutenberg owns block editing, selection, insertion, movement, List View, history, Save/Update, revisions and normal block rendering.
- Native Block Supports remain the first choice for base typography, spacing, dimensions, color, layout and alignment.
- Nodera extends selected blocks through public Gutenberg integration points such as `editor.BlockEdit`, `BlockControls` and `InspectorControls`.
- Block-level Nodera UI lives in the native block toolbar and Block settings sidebar.
- The top-level Nodera PluginSidebar is reserved for page-level AI, Global Design and diagnostics.

## Ownership

- The WordPress block registry / `block.json` owns block schemas and capabilities.
- Global Styles / `theme.json` owns global design persistence.
- Block Bindings owns dynamic attribute connections.
- The Interactivity API owns Nodera block frontend interactions.
- Nodera owns stable AI identity, scoped AI export/import, context sanitization, patch validation, diff/review and professional UX where Gutenberg does not already provide the capability.

## AI exchange and apply path

The primary flow is provider-neutral and API-key-free:

`Gutenberg scope → nodera-ai-context/v1 → server sanitization → nodera-ai-export/v1 → external AI → nodera-patch/v1 → server validation → diff/quality → explicit Apply`.

AI never writes a separate Nodera page model. Validated operations resolve persistent `noderaId` values to current Gutenberg `clientId` values and dispatch through `core/block-editor`. Apply leaves the post dirty and does not auto-save, so native Gutenberg Undo and WordPress Save/Update remain authoritative.

Optional direct generation remains available through the `nodera_ai_generate_patch` provider hook. Direct and portable modes converge on the same `nodera-patch/v1` validator and cannot bypass fingerprint, scope, contract or candidate-tree validation.

## Composition root

`nodera.php` performs requirements/autoload/bootstrap only. `Nodera\Plugin` registers the identity, contracts, responsive compatibility, bindings, legacy blocks, editor integration and REST modules.

## Rendering

Nodera does not render ordinary Gutenberg pages through a custom renderer. `WP_HTML_Tag_Processor` adds a safe `data-nodera-id` to rendered block roots where possible. Legacy responsive/state CSS uses that persistent selector while ordinary block rendering remains WordPress-native.
