=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0-rc.3
License: GPLv2 or later

Nodera adds AI-native professional authoring directly inside Gutenberg while preserving WordPress as the document, style, binding, rendering, history and revision engine.

== Description ==

Nodera `0.1.0-rc.3` is a commercial-hardening release candidate for WordPress 7.1+. It is not yet production-certified stable software.

The primary workflow needs no API key: Export a block/subtree/page as a sanitized `nodera-ai-export/v1` package, process it with an external AI, then import the returned `nodera-patch/v1`. Nodera validates fingerprint, exact scope, live block contracts, attributes, URLs/CSS and candidate structure before Diff/Preview and explicit Apply to Gutenberg.

RC3 adds protocol 1.0 schemas/integrity metadata, stale-session conflict handling, Before/After responsive previews, third-party Block Contract adapters, optional ACF/WooCommerce native Block Bindings, richer visual facts, onboarding/readiness diagnostics, rollback-safe migration tracking and an optional signed commercial updater. Licensing never disables existing Gutenberg content or editor access.

Direct AI providers remain optional under Settings > Nodera AI.

== Installation ==

Upload the packaged plugin ZIP and activate Nodera. End users do not need Node.js, npm, Composer or an AI API key. Open Tools > Nodera for readiness/onboarding, then use Nodera directly inside Gutenberg.

== Changelog ==

= 0.1.0-rc.3 =
* Formalized portable AI protocol 1.0 and published JSON Schemas.
* Added export SHA-256 integrity metadata and explicit stale-session conflict handling.
* Added semantic diff summaries, Before/After responsive preview and quality-error Apply blocking.
* Added third-party Block Contract adapter API; unknown third-party blocks remain non-authorable by default.
* Added optional native ACF scalar and WooCommerce product Block Bindings sources.
* Added richer bounded same-origin visual context and commercial onboarding/readiness diagnostics.
* Added non-gating commercial entitlement settings, signed update-manifest verification and package checksum verification.
* Added rollback-safe migration tracking without rewriting Gutenberg post_content.
* Pinned direct npm/Composer dependencies and added a stable lockfile/reproducibility gate.
* Expanded CI definitions to PHP 8.1-8.4 and Playwright configuration to Chromium, Firefox and WebKit.

= 0.1.0-rc.2 =
* Made Export → external AI → Import the primary API-key-free workflow.
* Added sanitized portable sessions, block/subtree/page scopes and strict import validation.

= 0.1.0-rc.1 =
* Added activation/runtime guards, direct-AI throttling, safe provider transport and package/security hardening.
