=== Nodera — AI-native WordPress Builder ===
Contributors: quochung9920
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0-rc.4
License: GPLv2 or later

Nodera adds AI-native professional authoring directly inside Gutenberg while preserving WordPress as the document, style, binding, rendering, history and revision engine.

== Description ==

Nodera `0.1.0-rc.4` is a visual-fidelity/commercial-hardening release candidate for WordPress 7.1+. It is not yet production-certified stable software.

The primary workflow needs no API key: export a block/subtree/page as a sanitized `nodera-ai-export/v1` package, process it with an external AI, then import the returned `nodera-patch/v1`. Nodera validates fingerprint, exact scope, live block contracts, attributes, URLs/CSS and candidate structure before Diff/Preview and explicit Apply to Gutenberg.

RC4 adds **Nodera Visual AI** for high-fidelity external-AI redesign. It measures the native Gutenberg editor at Desktop, Tablet and Mobile device previews, exports richer computed layout/typography/media/semantic facts plus a layout graph and resolved Global Styles/Settings, can bundle best-effort PNG/SVG visual captures and optional reference images, and provides Visual QA plus a no-API correction-bundle loop.

RC3 commercial/security capabilities remain: protocol 1.0 schemas/integrity metadata, stale-session conflict handling, third-party Block Contract adapters, optional ACF/WooCommerce native Block Bindings, onboarding/readiness diagnostics, rollback-safe migration tracking and an optional signed commercial updater. Licensing never disables existing Gutenberg content or editor access.

Direct AI providers remain optional under Settings > Nodera AI.

== Installation ==

Upload the packaged plugin ZIP and activate Nodera. End users do not need Node.js, npm, Composer or an AI API key. Open Tools > Nodera for readiness/onboarding, then use Nodera directly inside Gutenberg. Use the Nodera Visual AI sidebar when external AI needs richer visual context or design references.

== Changelog ==

= 0.1.0-rc.4 =
* Added Nodera Visual AI high-fidelity external-AI sidebar.
* Added native Gutenberg Desktop/Tablet/Mobile measurement using core/editor device preview with state restoration.
* Added Visual Facts v2: richer CSS/layout/typography/media/semantic measurements, contrast, provenance hints and layout graph.
* Added read-only ancestor/sibling context ring without materializing editable stable IDs.
* Added bounded/redacted resolved WordPress Global Settings/Global Styles design-context endpoint.
* Added design and visual fingerprints for external-AI context traceability.
* Added optional reference-image manifests and bundling.
* Added provider-neutral ZIP multimodal bundle with session, prompt, visual manifest and best-effort PNG/SVG captures.
* Added deterministic Visual QA and correction-bundle loop for no-API iterative fixing.
* Added clean-build/runtime/package verification for the visual-fidelity runtime.

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
