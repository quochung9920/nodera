# Global Design

Nodera Design is a focused UX over WordPress Global Styles. It does not create a complete parallel token database and does not rewrite theme files for ordinary user changes.

The first alpha reads the current theme global-style REST resource and updates supported text/background color styles through the native `/wp/v2/global-styles` controller. If the active editor/theme does not expose a writable Global Styles record, the UI reports the capability as unavailable instead of pretending the change was saved.
