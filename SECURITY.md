# Security Policy

Nodera treats external AI output, direct-provider responses and imported JSON as untrusted input. Security-sensitive changes must preserve Gutenberg scope validation, target fingerprints, block contracts, context redaction, URL/CSS restrictions and explicit user Apply.

Portable `nodera-ai-export/v1` sessions are generated only after capability, fingerprint and editable-scope checks. The export context is passed through `ContextSanitizer` before it leaves WordPress. Session IDs are trace identifiers only; they do not create a second document, history or revision store. Export integrity is a deterministic SHA-256 transport fingerprint, not authorization or a cryptographic publisher signature.

RC4 Visual Fidelity adds screenshots, per-viewport DOM/style measurements, layout/design fingerprints and optional user-selected reference images as external-AI context. These inputs never widen `target.stableIds`, never bypass normal import validation and never become canonical content. Ancestor/sibling context-ring measurements are explicitly read-only. Browser-measured media/CSS URLs are sanitized so query strings/fragments that could contain signed-CDN credentials are removed before the portable session is returned.

`GET /wp-json/nodera/v1/design-context` requires editor capability and returns bounded/redacted resolved WordPress Global Settings/Global Styles plus non-secret theme metadata. It does not expose WordPress credentials, cookies or REST nonces. Optional reference images are included in a multimodal bundle only after an editor explicitly selects the local files; Nodera does not silently crawl arbitrary private media into the bundle.

Best-effort screenshot generation may fetch same-origin image URLs with the current browser session only to embed pixels in the user-requested local export. Cross-origin media is not credential-forwarded by Nodera's snapshot embedding logic and failure degrades to metadata/SVG/structural context rather than weakening browser-origin restrictions.

Imported `nodera-patch/v1` data must never bypass server validation, candidate construction, semantic diff/quality review or explicit Apply. A stale or wrong-scope patch is rejected rather than heuristically merged. Visual QA/correction bundles are advisory transport context only; a correction returned by an AI still goes through the same patch validator.

Unknown third-party blocks are not AI-authorable by default. A trusted WordPress integration must explicitly register a reviewed Block Contract adapter; adapters may narrow the live registered schema but do not bypass normal Nodera validation.

The optional commercial updater is inert until an explicit HTTPS manifest URL and public key are configured. Update manifests are verified with RSA/SHA-256, package URLs are safe-HTTP validated, redirects are disabled, packages are downloaded to a temporary file and SHA-256 checked before installation. License keys are server-side update/support credentials and never gate existing Gutenberg content or editor access.

## Reporting a vulnerability

Please use GitHub's private security reporting / Security Advisory flow for this repository when available. Do not include API keys, license keys, WordPress credentials, cookies, nonces, private page content or private reference images in public issues.

Include a minimal reproduction, affected Nodera version, WordPress/PHP versions and the security boundary that can be crossed. Avoid testing against systems you do not own or have permission to test.

## Supported release line

The current `0.1.0-rc.*` line is a release-candidate series targeting WordPress 7.1+ and PHP 8.1+. It is not production-certified until the gates in `docs/PRODUCTION_READINESS.md` are satisfied.
