# Commercial distribution and updates

Nodera's editor/content behavior is independent from licensing. A missing, invalid or expired commercial entitlement must never disable Gutenberg content, remove block attributes, prevent Save, or make existing pages unrenderable.

## Entitlement

`Settings → Nodera Commercial` stores an optional update/support key. Production installations may instead define:

```php
define( 'NODERA_LICENSE_KEY', '...' );
```

The key is server-side only and is sent to the explicitly configured update service in the `X-Nodera-License` request header. It is not exposed in editor settings or diagnostics.

## Signed updater

The updater is inert unless both constants are configured:

```php
define( 'NODERA_UPDATE_MANIFEST_URL', 'https://updates.example.com/nodera/manifest.json' );
define( 'NODERA_UPDATE_PUBLIC_KEY_PEM', "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----" );
```

Expected manifest:

```json
{
  "version": "0.1.0-rc.4",
  "package": "https://updates.example.com/files/nodera-0.1.0-rc.4.zip",
  "sha256": "64-lowercase-or-uppercase-hex-characters",
  "signature": "base64-signature",
  "requires": "7.1",
  "tested": "7.1",
  "requires_php": "8.1",
  "details_url": "https://example.com/nodera/changelog",
  "changelog": "Optional trusted changelog HTML"
}
```

The signature payload is exactly:

```text
<version>\n<package>\n<lowercase-sha256>
```

The client validates a public HTTPS manifest URL, uses WordPress safe HTTP with zero redirects and bounded responses, verifies the RSA/SHA-256 signature, downloads the package to a temporary file itself, and validates SHA-256 before WordPress installs it.

## Rollback policy

- Releases must not rewrite Gutenberg `post_content` during plugin boot or update.
- Internal migrations are idempotent and tracked through `nodera_schema_version`.
- A rollback to an earlier compatible plugin should leave WordPress page content intact.
- Protocol-breaking changes require a new protocol/schema version instead of silently rewriting imported/exported payloads.
- Keep the previous signed release available to support controlled rollback when operationally necessary.

## Stable-release requirements

Before a commercial stable release, generate and review `package-lock.json` and `composer.lock` from the pinned manifests in a trusted networked release environment, then run `npm run release:stable:verify`. Do not hand-author dependency lockfiles.

Repository branch protection should require reviewed pull requests and successful quality/package checks before merging to `main`. This GitHub setting is repository-level governance and is not configured by plugin runtime code.
