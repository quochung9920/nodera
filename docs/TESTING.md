# Testing

Automated repository gates:

```bash
npm install --no-audit --no-fund
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

`verify:runtime` requires a single `build/editor.js` Gutenberg-native runtime and rejects the temporary alpha.4 `build/gutenberg-native.js` bridge.

Real WordPress acceptance uses Playwright and environment variables only:

```bash
WP_BASE_URL=http://localhost:8083 \
WP_ADMIN_USER=... \
WP_ADMIN_PASSWORD=... \
npm run test:e2e
```

The alpha.5 E2E suite checks:

- direct Gutenberg block toolbar/Inspector integration;
- lazy persistent block identity instead of eager whole-document mutation;
- native `style.@tablet` responsive authoring;
- native Core Button pseudo-state authoring plus Gutenberg Undo;
- Core Accordion/Tabs availability and legacy Nodera variants being non-insertable;
- explicit direct-AI provider state inside Gutenberg.

Provider-backed generation should additionally be exercised on a private local/test environment with a real provider key: Generate → validate → review diff/quality → Apply → Undo → Save → Reload → frontend verification. Provider keys must never be committed.

Browser tests are skipped when required environment variables are absent. A skip is not a browser PASS.
