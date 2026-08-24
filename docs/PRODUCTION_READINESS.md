# Production readiness

Nodera `0.1.0-rc.2` is a production-oriented release candidate, not a production-certified stable release.

## Runtime gates

A production approval requires all of the following evidence on a clean WordPress 7.1+ site:

- plugin activation succeeds with PHP 8.1+ and all committed runtime assets present;
- Gutenberg loads with Nodera controls and no new console/PHP errors;
- selected-block, selected-subtree, one-block-page and whole-page AI scopes remain isolated correctly;
- block-only export does not materialize stable IDs for untouched descendants;
- `nodera-ai-export/v1` is generated only after live fingerprint/scope checks and server-side context sanitization;
- Copy for AI, Download Session JSON and Download Prompt work without configuring an AI provider/API key;
- pasted and uploaded `nodera-patch/v1` results pass server validation → diff/quality review → explicit Apply → native Undo/Redo → Save → Reload;
- stale fingerprints, wrong-session targets, scope escape, unsafe URLs/CSS, invalid attributes/blocks and duplicate IDs are rejected;
- responsive `@tablet` / `@mobile` and supported pseudo states persist through Save/Reload and render on the frontend;
- Block Bindings and Global Styles persist through native WordPress APIs;
- optional provider credentials never appear in portable exports, editor JS, REST diagnostics, post content or browser logs;
- a 50–100 block page shows no request loop, mass stable-ID write or material typing/selection regression.

## Portable AI security gates

- exported page/block context is passed through `ContextSanitizer` before it leaves WordPress;
- the export endpoint capability-checks `edit_post`, bounds request size, verifies current fingerprint and requires exact editable stable IDs;
- exported session IDs are trace identifiers only and do not become a second state/history/document store;
- `target.kind=block` exports include only the selected root stable ID as editable scope;
- imported AI JSON is untrusted and cannot Apply until `PatchValidator`, candidate construction, semantic diff and quality review succeed;
- Apply never auto-saves and remains reversible through native Gutenberg history.

## Release gates

Before promoting an RC beyond release-candidate status:

- PHP syntax, PHPUnit and PHPCS pass;
- TypeScript, JS/CSS lint and JS unit tests pass;
- a clean `npm run build` passes `npm run verify:runtime`;
- `npm run package` creates both the ZIP and SHA-256 checksum;
- `npm run verify:package` verifies version synchronization, runtime files and checksum;
- the packaged ZIP is installed into a clean WordPress site and the runtime gates above pass;
- portable sessions are tested with at least two different external AI clients/models to confirm protocol portability;
- supported themes/plugins are smoke-tested and accessibility receives a manual keyboard/screen-reader review.

## Security hardening inherited from rc.1

- activation/runtime guards reject unsupported WordPress/PHP versions and missing production assets;
- optional direct AI generation is capability-checked, fingerprint/scope validated and rate-limited per user/post;
- provider requests use WordPress safe remote HTTP, no redirects, bounded timeouts and a response-size limit;
- custom compatible endpoints must pass public HTTPS safe-URL validation;
- production credentials may be supplied from `wp-config.php` constants and remain server-side;
- uninstall removes provider configuration stored in WordPress options;
- all AI output remains untrusted until `nodera-patch/v1` validation succeeds.

## Remaining certification work

The repository still needs a fully green real-browser acceptance run on a maintained WordPress 7.1 environment and broad compatibility/accessibility evidence before it should be described as production-certified. Dependency lockfiles are also recommended before a long-lived stable release so developer rebuilds are fully reproducible.
