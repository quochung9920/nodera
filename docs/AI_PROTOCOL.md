# Nodera portable AI protocol

Nodera 0.1.0-rc.4 uses the provider-neutral transport contract introduced in RC3 for Export → external AI → Import and adds backward-compatible Visual Fidelity 2.0 context inside the existing v1 open object fields.

## Version 1.0

- context: `nodera-ai-context/v1`
- export envelope: `nodera-ai-export/v1`
- AI result: `nodera-patch/v1`
- schemas: `schemas/nodera-ai-context-v1.schema.json`, `schemas/nodera-ai-export-v1.schema.json`, `schemas/nodera-patch-v1.schema.json`
- capability endpoint for authenticated editors: `GET /wp-json/nodera/v1/protocol`

The export endpoint stamps sanitized sessions with a protocol descriptor and a SHA-256 integrity value over the target, sanitized context and output requirements. Integrity is transport evidence; it is not a signature and does not grant authority to a patch.

## Compatibility policy

Protocol `1.x` keeps the three v1 schema identifiers stable. Additive capability/context metadata may be introduced without changing the schema identifier where the existing schema explicitly permits an object. RC4 Visual Fidelity therefore enriches `task`, `design`, `visualFacts` and `environment` without changing the canonical v1 target or patch operation model.

Any incompatible target/operation/schema change requires a new `/v2` schema and explicit migration/negotiation support. Nodera must never silently reinterpret an unknown schema. Unknown protocol/schema versions are rejected with deterministic Nodera error codes.

Visual bundle files (`prompt.txt`, PNG/SVG captures, reference images and visual manifests) are companion transport artifacts. They are not a new page schema and never replace the v1 session target/fingerprint or `nodera-patch/v1` result contract.

## Scope rules

- `block`: only the selected root stable ID is editable; inner block structure cannot be changed.
- `subtree`: the selected root and its descendants are editable.
- `page`: the current Gutenberg document root is editable.

Portable sessions are temporary transport context. They are not persisted as a second page document, history or revision store.

## Import trust boundary

External AI output is untrusted even when the export integrity value matches. Import still requires target fingerprint equality, exact editable stable IDs, registered block contracts, attribute and relationship validation, URL/CSS restrictions, candidate construction, semantic diff, quality review and explicit Apply.

Visual facts, screenshots, change-policy hints, QA issues and user-selected design references provide context only. They never widen editable stable IDs or authorize operations.

## Error behavior

Clients should treat HTTP 409 errors as stale/mismatched session conflicts and re-export instead of auto-merging. HTTP 400 indicates invalid schema/content. HTTP 403 indicates scope/capability violation. HTTP 413 indicates bounded payload limits. RC4 permits a larger but still bounded export request so three native device-preview measurements can be sanitized server-side.

## Extension points

Trusted WordPress integrations can register third-party block adapters through `nodera_register_block_contract_adapters`. They must opt blocks into AI authoring explicitly and may restrict the live block attribute schema further. Unknown third-party blocks remain non-authorable by default.
