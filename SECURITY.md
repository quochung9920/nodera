# Security Policy

Nodera treats AI output and provider responses as untrusted input. Security-sensitive changes should preserve Gutenberg scope validation, target fingerprints, block contracts, context redaction, URL/CSS restrictions and explicit user Apply.

## Reporting a vulnerability

Please use GitHub's private security reporting / Security Advisory flow for this repository when available. Do not include API keys, WordPress credentials, cookies, nonces or private page content in public issues.

Include a minimal reproduction, affected Nodera version, WordPress/PHP versions and the security boundary that can be crossed. Avoid testing against systems you do not own or have permission to test.

## Supported release line

The current `0.1.0-rc.*` line is a release-candidate series targeting WordPress 7.1+ and PHP 8.1+. It is not yet production-certified until the production-readiness gates in `docs/PRODUCTION_READINESS.md` are satisfied.
