# Production readiness

Nodera `0.1.0-rc.4` is a visual-fidelity/commercial-hardening release candidate, not a production-certified stable release.

## Runtime gates

A stable production approval requires evidence on clean WordPress 7.1+ sites that:

- activation succeeds on PHP 8.1–8.4 with all committed runtime assets, including Visual Fidelity 2.0;
- Gutenberg loads with no new console/PHP errors;
- block, subtree, one-block-page and whole-page scopes remain isolated;
- block-only selection/export never materializes stable IDs for untouched descendants;
- portable export works without any AI API key and returns protocol 1.0 plus SHA-256 integrity metadata;
- export context is server-sanitized and contains no credentials/nonces/cookies/private secret-like fields;
- signed/query credentials in browser-measured media/CSS URLs are stripped before portable export;
- at least two different external AI clients can return conforming `nodera-patch/v1` for the same protocol;
- imported patches pass exact-session/fingerprint/scope/contract/URL/CSS/candidate validation before Diff/Preview;
- stale sessions show explicit conflict resolution and are never auto-merged;
- deterministic error/critical quality findings block Apply;
- Apply → native Undo/Redo → Save → Reload → frontend passes;
- `@tablet`, `@mobile`, supported pseudo states, Block Bindings and Global Styles persist through native WordPress APIs;
- ACF/WooCommerce adapters are tested when those integrations are claimed as supported;
- a 100-block page shows no request loop, mass stable-ID mutation or material typing/selection regression.

## Visual fidelity gates

RC4 Visual Fidelity must be verified on a real WordPress editor before stable promotion:

- **Nodera Visual AI** loads only in the editor and does not create a second renderer/document/history engine;
- Desktop, Tablet and Mobile capture uses native `core/editor` device preview switching and restores the user's original device state;
- measured viewport widths match the real Gutenberg editor canvas rather than the surrounding admin viewport;
- block/subtree/page visual capture preserves the exact editable stable-ID scope while ancestors/siblings remain read-only context;
- Visual Facts v2 contains bounded layout/typography/media/semantic facts without credentials or signed URL query strings;
- resolved `/nodera/v1/design-context` Global Settings/Styles are permission checked, bounded and redacted;
- design and visual fingerprints are deterministic for an unchanged editor/design state;
- optional reference images are included only by explicit user selection and their manifest hashes/dimensions match the files;
- the multimodal ZIP opens in standard ZIP tooling and contains `session.json`, `prompt.txt`, visual manifest and expected visual/reference assets;
- Desktop/Tablet/Mobile PNG generation works for representative same-origin pages; SVG fallback is accepted and clearly identified when rasterization is not possible;
- cross-origin media failure degrades safely without aborting the structural export;
- Visual QA reports reproducible overflow/clipping/zero-size/mobile-wrap/contrast/image-distortion findings for controlled fixtures;
- correction bundles perform a fresh fingerprinted export and contain the current QA findings rather than reusing a stale session;
- at least two external multimodal AI clients use the bundle/reference images and produce valid `nodera-patch/v1` results with visibly better layout fidelity than structure-only export on the same reference task;
- visual export of a representative 100-block page stays within the server request bound or fails clearly without modifying the Gutenberg document.

## Release engineering gates

Before promotion beyond RC:

- PHP syntax/PHPUnit pass on 8.1, 8.2, 8.3 and 8.4;
- PHPCS, TypeScript, JS/CSS lint and JS unit tests pass;
- exact direct dependency pin verification passes;
- generated/reviewed `package-lock.json` and `composer.lock` are committed;
- `npm run release:stable:verify` passes from a clean checkout;
- clean build passes `npm run verify:visual` and `npm run verify:runtime` with no source/runtime drift;
- package ZIP + SHA-256 verification passes and includes the visual runtime/assets/controller;
- the packaged ZIP, not a source checkout, passes clean-install browser acceptance;
- Chromium, Firefox and WebKit acceptance passes, including `tests/e2e/visual-fidelity.spec.ts`;
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

## RC4 hardening already implemented

RC4 contains all RC3 commercial hardening plus:

- Visual Fidelity 2.0 provider-neutral external-AI sidebar;
- native Gutenberg Desktop/Tablet/Mobile device-preview measurement with state restoration;
- richer per-viewport computed layout, typography, media and semantic facts;
- Gutenberg style/preset provenance hints and parent/child layout graph;
- read-only ancestor/sibling visual context ring;
- authenticated bounded/redacted resolved Global Settings/Global Styles design-context endpoint;
- visual and design fingerprints;
- optional reference-image hashing/dimensions and bundle inclusion;
- provider-neutral ZIP multimodal bundle with best-effort PNG/SVG visual snapshots;
- deterministic three-viewport Visual QA and fresh correction-bundle loop;
- visual URL query/fragment credential stripping in `ContextSanitizer`;
- clean-build source/runtime drift gate for the Visual Fidelity runtime;
- real-browser acceptance definitions for the visual runtime/design endpoint/native device preview.

RC3 foundations remain: protocol 1.0 registry/JSON Schemas/integrity, stale-session conflict UI, Block Contract adapters, optional ACF/WooCommerce Block Bindings, onboarding/readiness, no-`post_content` migrations, non-gating entitlement/signed updater, exact direct dependency pins, PHP 8.1–8.4 CI definitions and Chromium/Firefox/WebKit E2E configuration.

## Current external blockers

Stable certification still requires real WordPress/browser/theme/plugin/screen-reader evidence, trustworthy green CI execution, real external-AI visual-fidelity comparison evidence and generated/reviewed dependency lockfiles. These must not be represented as PASS until actually completed.
