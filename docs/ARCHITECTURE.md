# Architecture

## Canonical document

WordPress `post_content` and its Gutenberg block tree are the only canonical page document. Nodera does not store a parallel full-document session.

## Ownership

- Gutenberg owns block editing, selection, history, save, revisions and normal block rendering.
- The WordPress block registry owns block schemas and capabilities.
- Global Styles owns global design persistence.
- Block Bindings owns dynamic attribute connections.
- The Interactivity API owns Nodera block frontend interaction loading.
- Nodera owns stable AI identity, responsive overrides, scoped state/CSS, AI context/patch validation, diff/review and professional UX.

## Composition root

`nodera.php` performs requirements/autoload/bootstrap only. `Nodera\Plugin` registers the identity, contracts, responsive, bindings, blocks and REST modules.

## Rendering

Nodera does not render ordinary Gutenberg pages through a custom renderer. `WP_HTML_Tag_Processor` adds a safe `data-nodera-id` to rendered block roots where possible. Responsive/state CSS uses that persistent selector.
