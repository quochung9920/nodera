=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.0
Requires PHP: 8.1
Stable tag: 0.1.0-alpha.4
License: GPLv2 or later

Nodera adds professional AI authoring, responsive overrides, native Global Styles and Block Bindings UX directly inside Gutenberg while preserving the native WordPress document model.

== Description ==

Nodera is an alpha-stage Gutenberg extension. Gutenberg `post_content` remains canonical. Select a Gutenberg block to access Nodera AI from the block toolbar and Nodera AI, Responsive, Dynamic Data, and States & Effects from the native Block settings sidebar. Gutenberg continues to own base styling, List View, block insertion/reordering, Undo/Redo, Save/Update, revisions and rendering.

AI results are structured, scoped and validated before a user explicitly applies them; Apply does not automatically save the post. Direct AI generation is provider-neutral and uses the `nodera_ai_generate_patch` integration filter. If no provider bridge is configured, Nodera keeps the manual external-AI workflow as a fallback.

== Installation ==

Download the Nodera repository ZIP from the main branch or use a packaged Nodera ZIP, upload it in WordPress under Plugins > Add Plugin > Upload Plugin, then activate Nodera. The production `build/` runtime is included, so end users do not need Node.js, npm or Composer.

Open a page in Gutenberg and select any block. Use the AI action in the native block toolbar or open the Nodera panels in the standard Block sidebar.

== Changelog ==

= 0.1.0-alpha.4 =
* Moved the primary Nodera experience directly into Gutenberg Block Toolbar and InspectorControls.
* Added in-block Nodera AI, Responsive, Dynamic Data, and States & Effects controls.
* Added provider-neutral direct AI generation with mandatory Nodera patch validation before Apply.
* Kept external AI copy/paste as an explicit fallback instead of the primary workflow.
* Preserved Gutenberg as the owner of block tree, List View, base Block Supports, native Undo/Redo, Save, revisions and rendering.

= 0.1.0-alpha.3 =
* Added committed production runtime assets so Nodera can be installed and used without Node.js on the WordPress machine.
* Added prebuilt editor UI, CSS and Interactivity API runtime modules to main/package output.
* Synchronized runtime/package/block versions and installation documentation.

= 0.1.0-alpha.2 =
* Hardened AI patch validation and target fingerprints.
* Added candidate diff/preview and deterministic quality review.
* Added responsive/state/scoped CSS authoring.
* Added native Global Styles and Block Bindings UX.
* Added Interactivity API Accordion and Tabs blocks.
* Added diagnostics, tests and package verification.
