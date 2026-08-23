# Architecture

## Canonical document

WordPress `post_content` and its Gutenberg block tree are the only canonical page document. Nodera never stores a parallel complete document model.

## Identity

Gutenberg `clientId` is runtime-only. Nodera adds a persistent `noderaId` attribute to registered blocks and reconciles missing or duplicate identities in the editor. Frontend rendering exposes valid identities as `data-nodera-id` through `WP_HTML_Tag_Processor`.

## Ownership

- Gutenberg owns document editing, selection, undo/redo, save, revisions and ordinary block rendering.
- WordPress block registry owns block capabilities.
- Nodera BlockContractRegistry projects registered capabilities for AI.
- Nodera AI operates on transient context and patches only.

## Security

AI output is untrusted. Patches must declare `nodera-patch/v1`, stay within exported scope and match the exported target fingerprint. Unknown or unsafe block authoring is rejected.
