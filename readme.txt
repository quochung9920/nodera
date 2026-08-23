=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.0
Requires PHP: 8.1
Stable tag: 0.1.0-alpha.3
License: GPLv2 or later

Nodera adds professional AI authoring, responsive overrides, native Global Styles and Block Bindings UX to Gutenberg while preserving the native WordPress document model.

== Description ==

Nodera is an alpha-stage Gutenberg extension. Gutenberg `post_content` remains canonical. AI results are structured, scoped and validated before a user explicitly applies them; Apply does not automatically save the post.

== Installation ==

Download the Nodera repository ZIP from the main branch or use a packaged Nodera ZIP, upload it in WordPress under Plugins > Add Plugin > Upload Plugin, then activate Nodera. The production `build/` runtime is included, so end users do not need Node.js, npm or Composer.

== Changelog ==

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
