# Nodera

**Nodera — AI-native WordPress Builder**

Nodera runs directly inside the native WordPress block editor. Gutenberg `post_content` remains the only canonical page document; WordPress continues to own List View, rendering, Style Engine, Global Styles, Block Bindings, Save, revisions and Undo/Redo.

## 0.1.0-rc.3 — commercial hardening release candidate

RC3 targets WordPress 7.1+ and PHP 8.1+. The committed `build/` runtime lets WordPress users install and use Nodera without Node.js, npm, Composer or an AI API key.

This remains a **release candidate**, not a production-certified stable release. RC3 adds the product/release infrastructure needed for commercial pilots while keeping real-environment certification as an explicit gate.

### Gutenberg-native UX

Select a Gutenberg block to get Nodera AI in the native Block Toolbar/Inspector plus Responsive, Dynamic Data and States & Effects. Page-level tools expose whole-page portable AI and Global Design. Native Gutenberg/WordPress capabilities remain authoritative whenever they exist.

## Primary AI workflow: export → external AI → import

No API key is required:

1. Select one block, a subtree, or whole page.
2. Optionally describe the requested change.
3. **Copy for AI**, **Download Session JSON**, or **Download Prompt**.
4. Process the sanitized `nodera-ai-export/v1` package with ChatGPT, Claude, Gemini, Codex or another AI.
5. Return exactly one `nodera-patch/v1` object.
6. Paste/upload it and choose **Validate & Preview**.
7. Review semantic diff, deterministic quality findings and Before/After previews.
8. **Apply to Gutenberg**. Native Undo/Redo and Save/Update remain in control.

RC3 formalizes protocol 1.0, publishes JSON Schemas under `schemas/`, exposes authenticated protocol capabilities at `/wp-json/nodera/v1/protocol`, and stamps sanitized export envelopes with deterministic SHA-256 integrity metadata. Integrity is transport evidence, never authorization: every imported patch still passes fingerprint, exact scope, block-contract, attribute, URL/CSS, candidate-tree and quality validation.

If the Gutenberg target changes after export, Nodera does **not** auto-merge the stale patch. The editor shows an explicit conflict and offers Fresh Export or Discard.

### Export scopes

- **Selected block only** — only the selected root stable ID is editable; inner structure cannot be changed.
- **Selected block + inner blocks** — the full selected subtree is editable.
- **Whole page** — the current Gutenberg document root is editable.

Stable IDs are materialized lazily and checked for page-wide uniqueness.

## WordPress-native authoring

- responsive styling writes WordPress 7.1 `style.@tablet` / `style.@mobile` states;
- supported Core Button/Navigation Link states use `:hover`, `:focus`, `:focus-visible`, `:active`;
- Dynamic Data uses native Block Bindings;
- Global Design writes native WordPress Global Styles;
- Core Accordion/Tabs are preferred for new content; old Nodera variants remain hidden legacy compatibility blocks;
- AI Apply dispatches through `core/block-editor` and never auto-saves.

## Ecosystem adapters

RC3 adds a reviewed third-party block contract adapter API. Unknown third-party blocks remain AI read-only until a trusted integration explicitly opts them into authoring and may further restrict their registered attribute schema. See `docs/BLOCK_ADAPTERS.md`.

Dynamic Data now detects optional ACF and WooCommerce integrations and exposes safe native Block Bindings sources:

- ACF scalar fields by explicit field name;
- WooCommerce `name`, `sku`, `price`, `regular_price`, `sale_price`, `stock_status`, `permalink`.

These adapters do not introduce a parallel data-binding engine.

## Commercial operations

RC3 adds:

- **Tools → Nodera** onboarding/readiness screen with a non-secret support fingerprint;
- optional **Settings → Nodera Commercial** entitlement configuration;
- licensing that controls only update/support entitlement, never Gutenberg content or editor access;
- an inert-by-default signed commercial updater with safe HTTPS manifest transport, RSA/SHA-256 manifest verification and package SHA-256 verification before install;
- idempotent internal migration tracking that never rewrites `post_content`;
- compatibility matrix and rollback/distribution policy.

The updater requires explicit `NODERA_UPDATE_MANIFEST_URL` and `NODERA_UPDATE_PUBLIC_KEY_PEM` configuration. Production licenses may be supplied using `NODERA_LICENSE_KEY` in `wp-config.php`. See `docs/COMMERCIAL_DISTRIBUTION.md`.

## Optional direct AI providers

OpenAI, Anthropic, Google Gemini and OpenAI-compatible direct providers remain optional under **Settings → Nodera AI**. They use the same patch validator and are not required by the portable workflow.

## Release engineering

Direct npm and Composer dependencies are pinned to exact versions in RC3. A stable release additionally requires generated/reviewed `package-lock.json` and `composer.lock`; Nodera deliberately does not fabricate lockfiles. `npm run release:stable:verify` blocks stable promotion when either lockfile is absent.

Developer gates include PHP 8.1–8.4 syntax/PHPUnit matrix, PHPCS, TypeScript, JS/CSS lint, JS unit tests, clean build, runtime verification, ZIP/SHA-256 packaging and package verification. Real Playwright acceptance is configured for Chromium, Firefox and WebKit when a WordPress test site is supplied through environment variables.

```bash
npm install --no-audit --no-fund
npm run release:verify
composer install
vendor/bin/phpcs
vendor/bin/phpunit
```

Before a stable commercial release, generate/review the lockfiles in a trusted networked environment and run:

```bash
npm run release:stable:verify
```

## Architecture invariant

Nodera does not maintain a parallel whole-page document, fork Gutenberg, replace WordPress revisions, create a second history engine or render ordinary Core blocks through a second renderer.

## Status

`0.1.0-rc.3` is suitable for controlled commercial pilots/early access after site-specific acceptance testing. Do not describe it as production-certified stable until the real-browser, theme/plugin, accessibility and stable-lockfile gates in `docs/PRODUCTION_READINESS.md` are satisfied.

See `docs/AI_PROTOCOL.md`, `docs/AI_ARCHITECTURE.md`, `docs/BLOCK_ADAPTERS.md`, `docs/COMMERCIAL_DISTRIBUTION.md`, `docs/COMPATIBILITY_MATRIX.md`, `docs/TESTING.md`, `docs/PRODUCTION_READINESS.md`, `docs/KNOWN_LIMITATIONS.md` and `SECURITY.md`.
