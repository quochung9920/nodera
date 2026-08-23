# Testing

Automated repository gates:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci --no-audit --no-fund
composer install
npm run typecheck
npm run lint:js
npm run lint:css
npm run test:unit
vendor/bin/phpcs
vendor/bin/phpunit
rm -rf build && npm run build
npm run package
npm run verify:package
```

Real WordPress smoke testing uses Playwright and environment variables only:

```bash
WP_BASE_URL=http://localhost:8083 \
WP_ADMIN_USER=... \
WP_ADMIN_PASSWORD=... \
npm run test:e2e
```

The repository never stores local credentials. Browser tests are skipped when the environment variables are absent, which is reported separately from a real browser PASS.
