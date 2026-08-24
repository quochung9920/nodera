# Production readiness

Nodera `0.1.0-rc.3` is a commercial-hardening release candidate, not a production-certified stable release.

## Runtime gates

A stable production approval requires evidence on clean WordPress 7.1+ sites that:

- activation succeeds on PHP 8.1–8.4 with all committed runtime assets;
- Gutenberg loads with no new console/PHP errors;
- block, subtree, one-block-page and whole-page scopes remain isolated;
- block-only selection/export never materializes stable IDs for untouched descendants;
- portable export works without any AI API key and returns protocol 1.0 plus SHA-256 integrity metadata;
- export context is server-sanitized and contains no credentials/nonces/cookies/private secret-like fields;
- at least two different external AI clients can return conforming `nodera-patch/v1` for the same protocol;
- imported patches pass exact-session/fingerprint/scope/contract/URL/CSS/candidate validation before Diff/Preview;
- stale sessions show explicit conflict resolution and are never auto-merged;
- deterministic error/critical quality findings block Apply;
- Apply → native Undo/Redo → Save → Reload → frontend passes;
- `@tablet`, `@mobile`, supported pseudo states, Block Bindings and Global Styles persist through native WordPress APIs;
- ACF/WooCommerce adapters are tested when those integrations are claimed as supported;
- a 100-block page shows no request loop, mass stable-ID mutation or material typing/selection regression.

## Release engineering gates

Before promotion beyond RC:

- PHP syntax/PHPUnit pass on 8.1, 8.2, 8.3 and 8.4;
- PHPCS, TypeScript, JS/CSS lint and JS unit tests pass;
- exact direct dependency pin verification passes;
- generated/reviewed `package-lock.json` and `composer.lock` are committed;
- `npm run release:stable:verify` passes from a clean checkout;
- clean build passes runtime verification with no source/runtime drift;
- package ZIP + SHA-256 verification passes;
- the packaged ZIP, not a source checkout, passes clean-install browser acceptance;
- Chromium, Firefox and WebKit acceptance passes;
- compatibility targets in `COMPATIBILITY_MATRIX.md` are updated from `NOT YET VERIFIED` only with real evidence;
- keyboard and manual screen-reader review passes;
- GitHub `main` branch protection requires reviewed PRs and successful release checks.

## Commercial delivery gates

Before selling as stable self-service software:

- onboarding/readiness UX is verified on a clean install;
- signed update manifest and package checksum flows are exercised against the real update service;
- entitlement absence/expiry is verified not to gate existing Gutenberg content or editor access;
- previous signed version remains available for controlled rollback;
- upgrade and rollback leave Gutenberg `post_content` intact;
- support diagnostics expose no credentials or page content.

## RC3 hardening already implemented

- protocol 1.0 registry, JSON Schemas and export integrity metadata;
- stale-session conflict UI and Before/After responsive preview;
- third-party Block Contract adapter API with default-deny AI authoring;
- optional ACF scalar and WooCommerce native Block Bindings;
- compatibility/support diagnostics and onboarding;
- idempotent no-`post_content` migration tracking;
- optional non-gating commercial entitlement and signed update client;
- exact direct dependency pins plus an explicit lockfile gate;
- PHP 8.1–8.4 CI definitions and Chromium/Firefox/WebKit E2E configuration.

## Current external blockers

Stable certification still requires real WordPress/browser/theme/plugin/screen-reader evidence, trustworthy green CI execution and generated/reviewed dependency lockfiles. These must not be represented as PASS until actually completed.
