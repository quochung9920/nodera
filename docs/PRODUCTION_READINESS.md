# Production readiness

Nodera `0.1.0-rc.1` is a production-oriented release candidate, not a production-certified stable release.

## Runtime gates

A production approval requires all of the following evidence on a clean WordPress 7.1+ site:

- plugin activation succeeds with PHP 8.1+ and all committed runtime assets present;
- Gutenberg loads with Nodera controls and no new console/PHP errors;
- selected-block AI scope, one-block-page scope and whole-page scope remain isolated correctly;
- responsive `@tablet` / `@mobile` and supported pseudo states persist through Save/Reload and render on the frontend;
- Block Bindings and Global Styles persist through native WordPress APIs;
- AI Generate → server validation → diff/review → Apply → native Undo/Redo → Save → Reload passes;
- stale fingerprints, scope escape, unsafe URLs/CSS, invalid attributes/blocks and duplicate IDs are rejected;
- provider credentials never appear in editor JS, REST diagnostics, post content or browser logs;
- a 50–100 block page shows no request loop, mass stable-ID write or material typing/selection regression.

## Release gates

Before promoting an RC beyond release-candidate status:

- PHP syntax, PHPUnit and PHPCS pass;
- TypeScript, JS/CSS lint and JS unit tests pass;
- a clean `npm run build` passes `npm run verify:runtime`;
- `npm run package` creates both the ZIP and SHA-256 checksum;
- `npm run verify:package` verifies version synchronization, runtime files and checksum;
- the packaged ZIP is installed into a clean WordPress site and the runtime gates above pass;
- supported themes/plugins are smoke-tested and accessibility receives a manual keyboard/screen-reader review.

## Security hardening in rc.1

- activation/runtime guards reject unsupported WordPress/PHP versions and missing production assets;
- direct AI generation is capability-checked, fingerprint/scope validated and rate-limited per user/post;
- provider requests use WordPress safe remote HTTP, no redirects, bounded timeouts and a response-size limit;
- custom compatible endpoints must pass public HTTPS safe-URL validation;
- production credentials may be supplied from `wp-config.php` constants and remain server-side;
- uninstall removes provider configuration stored in WordPress options;
- AI provider output remains untrusted until `nodera-patch/v1` validation succeeds.

## Remaining certification work

The repository still needs a fully green real-browser acceptance run on a maintained WordPress 7.1 environment and broad compatibility/accessibility evidence before it should be described as production-certified. Dependency lockfiles are also recommended before a long-lived stable release so developer rebuilds are fully reproducible.
