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
npm run verify:visual
npm run verify:runtime
npm run package
npm run verify:package
```

`npm run release:verify` covers the JavaScript/build/package side. A stable release additionally requires real generated/reviewed dependency lockfiles and:

```bash
npm run release:stable:verify
```

Do not hand-author lockfiles. Generate them from the pinned manifests in a trusted networked release environment, review dependency changes, then commit them.

`verify:visual` syntax-checks the shipped Visual Fidelity runtime, rejects source/build drift and requires the multi-viewport/bundle/layout/fingerprint/correction markers. `verify:runtime` and `verify:package` additionally require the visual runtime/assets and VisualContextController.

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

RC4 acceptance covers the RC3 flows plus Visual Fidelity 2.0:

- direct Gutenberg Block Toolbar/Inspector integration;
- root-only lazy identity and a 100-block no-mass-ID smoke;
- native responsive/pseudo states plus native Undo;
- Core Accordion/Tabs preference;
- provider-free portable export/import controls;
- protocol 1.0/integrity metadata on the export endpoint;
- stale-session conflict UX before server Validate/Apply;
- keyboard activation and accessible upload control;
- dynamic-source capability exposure;
- Visual Fidelity runtime presence;
- authenticated resolved design-context endpoint;
- native `core/editor` Desktop → Tablet → Mobile device switching and exact restoration;
- loading Visual Fidelity does not materialize descendant stable IDs.

`tests/e2e/visual-fidelity.spec.ts` contains the first real-browser visual-runtime/device-preview acceptance. Stable certification must extend that evidence to actual multimodal bundle downloads, representative PNG/SVG captures, reference files, QA fixtures and correction bundles on maintained WordPress environments.

## Visual fidelity manual acceptance

For each supported browser, use a page containing headings, buttons, images, Group/Columns/Grid/Flex layouts and responsive styles:

1. select a block and export block-only Visual AI; verify descendants remain read-only/unidentified until subtree scope is chosen;
2. export the same target as subtree and as whole page;
3. verify the original Gutenberg device preview is restored after each export/QA run;
4. unzip the bundle and inspect `session.json`, `prompt.txt`, `visual/manifest.json`, three visual captures and optional references;
5. verify visual manifest geometry corresponds to the editor at Desktop/Tablet/Mobile;
6. verify media/CSS URLs in `session.json` have no query credentials/fragments;
7. process the same reference task with at least two external multimodal AI clients and import their `nodera-patch/v1` output through the normal validator;
8. create controlled overflow/clipping/low-contrast/distorted-image/mobile-heading fixtures and verify Visual QA findings;
9. export a correction bundle, verify it contains a fresh session/fingerprint plus QA issues, then repeat the AI/import loop;
10. confirm Apply remains native Gutenberg state: Undo/Redo, Save, Reload and frontend rendering work normally.

## Full commercial acceptance

The packaged ZIP should additionally be exercised end-to-end:

1. clean install/activation;
2. block, subtree, one-block-page and whole-page portable exports;
3. process sessions with at least two external AI clients/models;
4. paste/upload `nodera-patch/v1`;
5. Validate → semantic Diff → quality review → Before/After preview;
6. Apply → native Undo/Redo → Save → Reload → frontend;
7. stale fingerprint, scope escape, unsafe URL/CSS, invalid block/attribute and duplicate-ID negatives;
8. Visual AI multimodal export/reference/QA/correction loop;
9. ACF/WooCommerce binding tests when those integrations are enabled;
10. 100-block performance/request-loop and visual-export-size smoke;
11. keyboard and manual screen-reader review;
12. signed-update manifest/package verification against the real commercial update endpoint;
13. rollback to the prior compatible signed release without modifying Gutenberg `post_content`.

See `PRODUCTION_READINESS.md`, `VISUAL_AI_PORTABILITY.md` and `COMPATIBILITY_MATRIX.md` before promoting an RC to stable.
