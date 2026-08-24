# Testing

## Repository gates

```bash
npm install --no-audit --no-fund
npm run verify:deps
composer validate --strict
composer install
npm run typecheck
npm run lint:js
npm run lint:css
npm run test:unit
vendor/bin/phpcs
vendor/bin/phpunit
rm -rf build && npm run build
npm run verify:runtime
npm run package
npm run verify:package
```

`npm run release:verify` covers the JavaScript/build/package side. A stable release additionally requires real generated/reviewed dependency lockfiles and:

```bash
npm run release:stable:verify
```

Do not hand-author lockfiles. Generate them from the pinned manifests in a trusted networked release environment, review dependency changes, then commit them.

## CI matrix

The workflow defines PHP syntax and PHPUnit coverage for PHP 8.1, 8.2, 8.3 and 8.4 plus PHPCS, TypeScript, JS/CSS lint, JS unit tests, clean build, runtime verification and package/checksum verification. The zero-dependency `runner-smoke` remains a separate infrastructure signal.

## Real WordPress acceptance

Playwright reads environment variables only:

```bash
WP_BASE_URL=http://localhost:8083 \
WP_ADMIN_USER=... \
WP_ADMIN_PASSWORD=... \
npm run test:e2e
```

Projects are configured for Chromium, Firefox and WebKit. Browser tests are skipped when credentials/base URL are absent; a skip is never a PASS.

RC3 acceptance covers:

- direct Gutenberg Block Toolbar/Inspector integration;
- root-only lazy identity and a 100-block no-mass-ID smoke;
- native responsive/pseudo states plus native Undo;
- Core Accordion/Tabs preference;
- provider-free portable export/import controls;
- protocol 1.0/integrity metadata on the export endpoint;
- stale-session conflict UX before server Validate/Apply;
- keyboard activation and accessible upload control;
- dynamic-source capability exposure.

## Full commercial acceptance

The packaged ZIP should additionally be exercised end-to-end:

1. clean install/activation;
2. block, subtree, one-block-page and whole-page portable exports;
3. process sessions with at least two external AI clients/models;
4. paste/upload `nodera-patch/v1`;
5. Validate → semantic Diff → quality review → Before/After preview;
6. Apply → native Undo/Redo → Save → Reload → frontend;
7. stale fingerprint, scope escape, unsafe URL/CSS, invalid block/attribute and duplicate-ID negatives;
8. ACF/WooCommerce binding tests when those integrations are enabled;
9. 100-block performance/request-loop smoke;
10. keyboard and manual screen-reader review;
11. signed-update manifest/package verification against the real commercial update endpoint;
12. rollback to the prior compatible signed release without modifying Gutenberg `post_content`.

See `PRODUCTION_READINESS.md` and `COMPATIBILITY_MATRIX.md` before promoting an RC to stable.
