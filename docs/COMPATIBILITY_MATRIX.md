# Compatibility certification matrix

This matrix separates **implemented compatibility logic** from **real-environment certification evidence**. Do not convert `NOT YET VERIFIED` into PASS without running the stated environment.

| Environment | Intended support | Automated/static coverage | Real-browser certification |
| --- | --- | --- | --- |
| WordPress 7.1.x | Required baseline | Activation guard + Core contract assumptions | NOT YET VERIFIED |
| PHP 8.1 | Supported | CI matrix configured | NOT YET VERIFIED |
| PHP 8.2 | Supported | CI matrix configured | NOT YET VERIFIED |
| PHP 8.3 | Supported | CI matrix configured | NOT YET VERIFIED |
| PHP 8.4 | Supported | CI matrix configured | NOT YET VERIFIED |
| Current default block theme | Target | Native Gutenberg APIs | NOT YET VERIFIED |
| ACF | Optional adapter | Runtime detection + native Block Bindings scalar source | NOT YET VERIFIED |
| WooCommerce | Optional adapter | Runtime detection + allowlisted product Block Bindings source | NOT YET VERIFIED |
| Kadence Blocks | Third-party context only until adapter registered | Contract adapter API available | NOT YET VERIFIED |
| GenerateBlocks | Third-party context only until adapter registered | Contract adapter API available | NOT YET VERIFIED |
| Spectra | Third-party context only until adapter registered | Contract adapter API available | NOT YET VERIFIED |
| Stackable | Third-party context only until adapter registered | Contract adapter API available | NOT YET VERIFIED |
| Chromium | Target browser | Playwright project configured | NOT YET VERIFIED |
| Firefox | Target browser | Playwright project configured | NOT YET VERIFIED |
| WebKit | Target browser | Playwright project configured | NOT YET VERIFIED |
| Keyboard-only editing | Required | Playwright keyboard smoke configured | NOT YET VERIFIED |
| Screen reader | Required before broad commercial stable claim | Manual gate only | NOT YET VERIFIED |

## Certification procedure

For each supported WordPress/PHP/theme combination, install the packaged ZIP into a clean site and run activation, Gutenberg load, responsive/state persistence, bindings/global styles, block/subtree/page portable export, import/validation/diff/Apply, native Undo/Redo, Save/Reload/frontend, stale-session conflicts and a 100-block performance smoke.

Third-party block libraries remain AI read-only unless a reviewed `BlockContractRegistry` adapter explicitly opts a block into authoring. This prevents an unknown plugin upgrade from silently expanding AI authority.
