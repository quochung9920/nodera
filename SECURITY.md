# Security Policy

Nodera treats external AI output, direct-provider responses and imported JSON as untrusted input. Security-sensitive changes must preserve Gutenberg scope validation, target fingerprints, block contracts, context redaction, URL/CSS restrictions and explicit user Apply.

Portable `nodera-ai-export/v1` sessions are generated only after capability, fingerprint and editable-scope checks. The export context is passed through `ContextSanitizer` before it leaves WordPress. Session IDs are trace identifiers only; they do not create a second document, history or revision store.

Imported `nodera-patch/v1` data must never bypass server validation, candidate construction, semantic diff/quality review or explicit Apply. A stale or wrong-scope patch must be rejected rather than merged heuristically.

## Reporting a vulnerability

Please use GitHub's private security reporting / Security Advisory flow for this repository when available. Do not include API keys, WordPress credentials, cookies, nonces or private page content in public issues.

Include a minimal reproduction, affected Nodera version, WordPress/PHP versions and the security boundary that can be crossed. Avoid testing against systems you do not own or have permission to test.

## Supported release line

The current `0.1.0-rc.*` line is a release-candidate series targeting WordPress 7.1+ and PHP 8.1+. It is not yet production-certified until the production-readiness gates in `docs/PRODUCTION_READINESS.md` are satisfied.
