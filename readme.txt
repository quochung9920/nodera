=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0-rc.1
License: GPLv2 or later

Nodera adds AI-native professional authoring directly inside Gutenberg while preserving WordPress as the document, style, data-binding, rendering, history and revision engine.

== Description ==

Nodera `0.1.0-rc.1` is a production-oriented release candidate for WordPress 7.1+. It is not yet production-certified stable software; promotion requires the runtime/release gates documented in `docs/PRODUCTION_READINESS.md`.

Select a block to access Nodera AI from the block toolbar plus Responsive, Dynamic Data and States & Effects from the standard Block sidebar. Responsive authoring writes native WordPress `style.@tablet` / `style.@mobile` states. Supported pseudo states use native WordPress style states. Dynamic Data uses Block Bindings and Global Design writes to WordPress Global Styles.

Direct AI can be configured under Settings > Nodera AI for OpenAI, Anthropic, Google Gemini or an OpenAI-compatible public HTTPS endpoint. Production credentials may instead be provided through `wp-config.php` constants. Provider context is sanitized, direct generation is rate-limited, safe WordPress HTTP is used for provider calls, and every generated `nodera-patch/v1` result must pass Nodera validation before Apply. Apply uses Gutenberg APIs and does not automatically save the post.

WordPress 7.1 Core Accordion and Tabs are preferred for new content. The old Nodera Accordion/Tabs remain registered only for legacy-content compatibility and are hidden from the inserter.

== Installation ==

Download the repository ZIP from main or use a packaged Nodera ZIP, upload it under Plugins > Add Plugin > Upload Plugin, then activate Nodera. Runtime files are included, so end users do not need Node.js, npm or Composer. Activation blocks unsupported WordPress/PHP versions or a package missing required runtime assets.

Open a page in Gutenberg and select a block. Configure a direct provider under Settings > Nodera AI when direct AI generation is required.

== Changelog ==

= 0.1.0-rc.1 =
* Added activation/runtime guards for WordPress/PHP compatibility and missing production assets.
* Added per-user/post direct AI generation throttling.
* Hardened provider transport with WordPress safe remote HTTP, no redirects, bounded timeout and response size.
* Added optional wp-config.php provider/model/API-key/endpoint constants for production secret management.
* Added non-secret release/runtime diagnostics and stored-provider cleanup on uninstall.
* Added package SHA-256 generation/verification, release checklist, security policy and dependency monitoring.
* Promoted alpha.5 to a production-oriented release candidate; real-browser and compatibility certification remain required before stable production claims.

= 0.1.0-alpha.5 =
* Requires WordPress 7.1 and migrates new responsive editing to native Gutenberg viewport style states.
* Uses native pseudo style states for supported Core Button and Navigation Link interactions.
* Added server-side OpenAI, Anthropic, Gemini and OpenAI-compatible provider configuration with sanitized provider context.
* Changed stable block identity assignment to lazy active-scope reconciliation instead of eagerly dirtying whole legacy pages.
* AI prefers WordPress Core Accordion/Tabs families; old Nodera variants are legacy-only and hidden from the inserter.
* Consolidated the editor runtime into build/editor.js and removed the temporary gutenberg-native.js bridge.

= 0.1.0-alpha.4 =
* Moved the primary Nodera experience directly into Gutenberg Block Toolbar and InspectorControls.
* Added provider-neutral direct AI generation with mandatory Nodera patch validation before Apply.
