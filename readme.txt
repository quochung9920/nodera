=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0-alpha.5
License: GPLv2 or later

Nodera adds AI-native professional authoring directly inside Gutenberg while preserving WordPress as the document, style, data-binding, rendering, history and revision engine.

== Description ==

Nodera is an alpha-stage WordPress 7.1+ Gutenberg extension. Gutenberg `post_content` remains canonical. Select a block to access Nodera AI from the block toolbar plus Responsive, Dynamic Data and States & Effects from the standard Block sidebar.

Alpha.5 writes responsive overrides into native WordPress `style.@tablet` / `style.@mobile` style states. Supported Button and Navigation Link pseudo states use native WordPress style states. Dynamic Data uses Block Bindings and Global Design writes to WordPress Global Styles.

Direct AI can be configured under Settings > Nodera AI for OpenAI, Anthropic, Google Gemini or an OpenAI-compatible HTTPS endpoint. API credentials remain server-side. Provider context is sanitized and every generated `nodera-patch/v1` result must pass Nodera validation before Apply. Apply uses Gutenberg APIs and does not automatically save the post.

WordPress 7.1 Core Accordion and Tabs are preferred for new content. The old Nodera Accordion/Tabs remain registered only for legacy-content compatibility and are hidden from the inserter.

== Installation ==

Download the repository ZIP from main or use a packaged Nodera ZIP, upload it under Plugins > Add Plugin > Upload Plugin, then activate Nodera. Production runtime files are included, so end users do not need Node.js, npm or Composer.

Open a page in Gutenberg and select a block. Configure a direct provider under Settings > Nodera AI when direct AI generation is required.

== Changelog ==

= 0.1.0-alpha.5 =
* Requires WordPress 7.1 and migrates new responsive editing to native Gutenberg viewport style states.
* Uses native pseudo style states for supported Core Button and Navigation Link interactions.
* Added server-side OpenAI, Anthropic, Gemini and OpenAI-compatible provider configuration with sanitized provider context.
* Changed stable block identity assignment to lazy active-scope reconciliation instead of eagerly dirtying whole legacy pages.
* AI now prefers WordPress Core Accordion/Tabs families; old Nodera variants are legacy-only and hidden from the inserter.
* Expanded Global Styles, Block Bindings, deterministic quality evidence and browser acceptance tests.
* Consolidated the editor runtime into build/editor.js and removed the temporary gutenberg-native.js bridge.
* Added clean runtime/package integrity checks.

= 0.1.0-alpha.4 =
* Moved the primary Nodera experience directly into Gutenberg Block Toolbar and InspectorControls.
* Added in-block Nodera AI, Responsive, Dynamic Data, and States & Effects controls.
* Added provider-neutral direct AI generation with mandatory Nodera patch validation before Apply.

= 0.1.0-alpha.3 =
* Added committed production runtime assets so Nodera can be installed without Node.js on the WordPress machine.

= 0.1.0-alpha.2 =
* Added AI patch validation, candidate diff/preview, responsive/state controls, Global Styles, Block Bindings, Interactivity blocks, diagnostics and package verification.
