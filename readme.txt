=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.0
Requires PHP: 8.1
Stable tag: 0.1.0-alpha.5
License: GPLv2 or later

Nodera adds AI-native professional authoring directly inside Gutenberg while preserving the native WordPress document, style, binding, history and rendering systems.

== Description ==

Nodera is an alpha-stage Gutenberg extension. Gutenberg `post_content` remains canonical. Select a Gutenberg block to access Nodera AI from the native block toolbar and Nodera AI, Responsive, Dynamic Data, and States & Effects from the native Block inspector. Gutenberg continues to own base Block Supports, List View, Undo/Redo, Save/Update, revisions and rendering.

On WordPress 7.1+, Nodera writes responsive overrides to native `style.@tablet` / `style.@mobile` block style states and uses native pseudo style states on supported blocks. Dynamic Data uses WordPress Block Bindings. New interactive content should use WordPress Core Tabs and Core Accordion; legacy Nodera Tabs/Accordion remain registered only for backwards compatibility and are hidden from the inserter.

AI results are structured, scoped and validated before a user explicitly applies them. Direct AI can be configured server-side under Settings > Nodera with OpenAI, Anthropic, Google Gemini or a custom HTTPS provider. Provider-bound context is sanitized and credentials are never exposed to the Gutenberg browser runtime.

== Installation ==

Download the Nodera repository ZIP from the main branch or use a packaged Nodera ZIP, upload it in WordPress under Plugins > Add Plugin > Upload Plugin, then activate Nodera. The production `build/` runtime is included, so end users do not need Node.js, npm or Composer.

Open a page in Gutenberg and select any block. Use the AI action in the native block toolbar or open the Nodera panels in the standard Block inspector.

== Changelog ==

= 0.1.0-alpha.5 =
* Added server-side OpenAI, Anthropic, Gemini and custom HTTPS provider configuration with secret-safe status reporting.
* Added recursive provider-context sanitization and kept mandatory patch validation before Apply.
* Moved WordPress 7.1 responsive overrides to native Gutenberg style states with alpha.4 compatibility fallback.
* Added native pseudo-style handling for supported WordPress blocks, including focus-visible.
* Retired Nodera Tabs/Accordion from new authoring in favor of WordPress Core equivalents while preserving legacy content parsing.
* Changed stable block IDs to lazy scope assignment so opening a legacy page does not mutate every block.
* Expanded native Block Bindings, Global Styles, design-quality checks, diagnostics and E2E definitions.
* Removed the alpha.4 `gutenberg-native.js` runtime bridge and hardened clean-build/package verification.
* Pinned direct JavaScript build dependencies for more predictable developer builds.

= 0.1.0-alpha.4 =
* Moved the primary Nodera experience directly into Gutenberg Block Toolbar and InspectorControls.
* Added in-block Nodera AI, Responsive, Dynamic Data, and States & Effects controls.
* Added provider-neutral direct AI generation with mandatory Nodera patch validation before Apply.
* Preserved Gutenberg as the owner of block tree, List View, native Undo/Redo, Save, revisions and rendering.

= 0.1.0-alpha.3 =
* Added committed production runtime assets so Nodera can be installed and used without Node.js on the WordPress machine.

= 0.1.0-alpha.2 =
* Hardened AI patch validation and target fingerprints.
* Added candidate diff/preview and deterministic quality review.
* Added responsive/state/scoped CSS authoring.
* Added native Global Styles and Block Bindings UX.
* Added Interactivity API legacy Accordion and Tabs blocks.
* Added diagnostics, tests and package verification.
