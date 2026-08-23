# Release

Nodera is alpha software. A release package is acceptable only when repository quality gates pass and `scripts/verify-package.mjs` confirms the expected compiled runtime files and block metadata exist.

The release ZIP is `dist/nodera-<version>.zip`. It contains runtime PHP, `build/`, `blocks/`, README and WordPress readme. Development tests, node_modules, credentials and local WordPress data are excluded.

A green CI package is automated evidence only. Real WordPress install/activate/editor/frontend testing must be reported independently when it is actually run.
