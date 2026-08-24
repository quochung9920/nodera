# Known limitations

Version `0.1.0-rc.1` is a release candidate, not a production-certified stable release.

- A site administrator must configure a supported AI provider/model/API key for direct generation. Production deployments can use `NODERA_AI_PROVIDER`, `NODERA_AI_MODEL`, `NODERA_AI_API_KEY` and optional `NODERA_AI_ENDPOINT` constants so secrets do not need to be stored in WordPress options.
- Provider availability, model identifiers, quotas, output quality and pricing are controlled by third parties.
- New responsive editing uses WordPress 7.1 native viewport style states. The old `noderaResponsive` compiler remains only to render/migrate alpha.4 content.
- Native block-instance pseudo states are exposed only where WordPress 7.1 Core supports them; restricted Custom CSS remains a fallback for unsupported effects.
- Legacy `nodera/accordion` and `nodera/tabs` remain registered so existing content renders. New content and AI output use WordPress Core Accordion/Tabs; automatic conversion is intentionally not performed.
- Dynamic Data exposes safe Core Block Bindings workflows. ACF and WooCommerce adapters are not bundled in this release candidate.
- Global Design writes directly to WordPress Global Styles and intentionally exposes a curated surface instead of recreating the full Site Editor UI.
- Browser visual capture only measures same-origin editor DOM/iframe nodes reachable by the current session and does not claim pixel-level screenshot similarity.
- AI output remains model-dependent and must be reviewed before Apply even after structural validation passes.
- Developer dependency lockfiles are not yet committed. The production runtime itself is prebuilt and packaged, but a long-lived stable release should add lockfiles so source rebuilds are fully reproducible.
- Manual screen-reader certification and broad commercial theme/plugin compatibility still require separate real-environment evidence.
- A fully green real-browser acceptance run on a maintained WordPress 7.1 environment is still required before Nodera should be described as production-certified. See `PRODUCTION_READINESS.md`.
