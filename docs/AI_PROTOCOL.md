# Nodera portable AI protocol

Nodera 0.1.0-rc.3 formalizes the provider-neutral transport contract used by Export → external AI → Import.

## Version 1.0

- context: `nodera-ai-context/v1`
- export envelope: `nodera-ai-export/v1`
- AI result: `nodera-patch/v1`
- schemas: `schemas/nodera-ai-context-v1.schema.json`, `schemas/nodera-ai-export-v1.schema.json`, `schemas/nodera-patch-v1.schema.json`
- capability endpoint for authenticated editors: `GET /wp-json/nodera/v1/protocol`

The export endpoint stamps sanitized sessions with a protocol descriptor and a SHA-256 integrity value over the target, sanitized context and output requirements. Integrity is transport evidence; it is not a signature and does not grant authority to a patch.

## Compatibility policy

Protocol `1.x` keeps the three v1 schema identifiers stable. Additive capability metadata may be introduced without changing the schema identifier. Any incompatible target/operation/schema change requires a new `/v2` schema and explicit migration/negotiation support.

Nodera must never silently reinterpret an unknown schema. Unknown protocol/schema versions are rejected with deterministic Nodera error codes.

## Scope rules

- `block`: only the selected root stable ID is editable; inner block structure cannot be changed.
- `subtree`: the selected root and its descendants are editable.
- `page`: the current Gutenberg document root is editable.

Portable sessions are temporary transport context. They are not persisted as a second page document, history or revision store.

## Import trust boundary

External AI output is untrusted even when the export integrity value matches. Import still requires target fingerprint equality, exact editable stable IDs, registered block contracts, attribute and relationship validation, URL/CSS restrictions, candidate construction, semantic diff, quality review and explicit Apply.

## Error behavior

Clients should treat HTTP 409 errors as stale/mismatched session conflicts and re-export instead of auto-merging. HTTP 400 indicates invalid schema/content. HTTP 403 indicates scope/capability violation. HTTP 413 indicates bounded payload limits.

## Extension points

Trusted WordPress integrations can register third-party block adapters through `nodera_register_block_contract_adapters`. They must opt blocks into AI authoring explicitly and may restrict the live block attribute schema further. Unknown third-party blocks remain non-authorable by default.
