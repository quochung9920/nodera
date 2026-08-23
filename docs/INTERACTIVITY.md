# Interactivity

Nodera ships two proof-of-architecture dynamic blocks:

- `nodera/accordion`
- `nodera/tabs`

Both use `block.json`, server rendering and `viewScriptModule` modules backed by `@wordpress/interactivity`. No jQuery or generic frontend React runtime is used.

Accordion exposes a real button with `aria-expanded`/`aria-controls`. Tabs expose `tablist`, `tab`, `tabpanel`, `aria-selected`, roving `tabindex`, click selection and Arrow/Home/End keyboard navigation.
