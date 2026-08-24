=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0-rc.2
License: GPLv2 or later

Nodera adds AI-native professional authoring directly inside Gutenberg while preserving WordPress as the document, style, data-binding, rendering, history and revision engine.

== Description ==

Nodera `0.1.0-rc.2` is a production-oriented release candidate for WordPress 7.1+. It is not yet production-certified stable software; promotion requires the runtime/release gates documented in `docs/PRODUCTION_READINESS.md`.

Select a block to access Nodera AI from the block toolbar plus Responsive, Dynamic Data and States & Effects from the standard Block sidebar. Responsive authoring writes native WordPress `style.@tablet` / `style.@mobile` states. Supported pseudo states use native WordPress style states. Dynamic Data uses Block Bindings and Global Design writes to WordPress Global Styles.

The primary AI workflow requires no API key: export a selected block, selected subtree or whole page as a sanitized `nodera-ai-export/v1` session, process it with any external AI, then paste or upload the returned `nodera-patch/v1` JSON. Nodera verifies fingerprint, editable scope, block contracts, attributes and candidate structure before showing diff/quality review and allowing explicit Apply to Gutenberg.

Direct OpenAI, Anthropic, Google Gemini and OpenAI-compatible integrations remain optional under Settings > Nodera AI. They are not required for the portable export/import workflow.

WordPress 7.1 Core Accordion and Tabs are preferred for new content. The old Nodera Accordion/Tabs remain registered only for legacy-content compatibility and are hidden from the inserter.

== Installation ==

Download the repository ZIP from main or use a packaged Nodera ZIP, upload it under Plugins > Add Plugin > Upload Plugin, then activate Nodera. Runtime files are included, so end users do not need Node.js, npm, Composer or an AI API key. Activation blocks unsupported WordPress/PHP versions or a package missing required runtime assets.

Open a page in Gutenberg, select a block, choose the export scope, send the portable session to your preferred AI, then import its validated patch result.

== Changelog ==

= 0.1.0-rc.2 =
* Made provider-neutral Export → external AI → Import the primary Nodera AI workflow; no API key is required.
* Added server-validated and sanitized `nodera-ai-export/v1` sessions with session IDs, fingerprints, exact editable scope and output rules.
* Added Copy for AI, Download Session JSON, Download Prompt, paste result and upload-result JSON controls directly inside Gutenberg.
* Added block-only, selected-subtree and whole-page export scopes.
* Block-only identity now materializes only the selected root ID; descendants remain untouched until a subtree/page workflow needs them.
* Imported patches must match the most recently exported session when present and always pass the existing server validator before Apply.
* Kept direct AI providers as an optional collapsed integration rather than a requirement.

= 0.1.0-rc.1 =
* Added activation/runtime guards for WordPress/PHP compatibility and missing production assets.
* Added per-user/post direct AI generation throttling.
* Hardened provider transport with WordPress safe remote HTTP, no redirects, bounded timeout and response size.
* Added optional wp-config.php provider/model/API-key/endpoint constants for production secret management.
* Added non-secret release/runtime diagnostics and stored-provider cleanup on uninstall.
* Added package SHA-256 generation/verification, release checklist, security policy and dependency monitoring.

= 0.1.0-alpha.5 =
* Requires WordPress 7.1 and migrates new responsive editing to native Gutenberg viewport style states.
* Uses native pseudo style states for supported Core Button and Navigation Link interactions.
* Added server-side provider adapters, lazy block identities and Core Accordion/Tabs preference.
* Consolidated the editor runtime into build/editor.js and removed the temporary gutenberg-native.js bridge.
