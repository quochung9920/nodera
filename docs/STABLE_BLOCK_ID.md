# Stable block identity

Gutenberg `clientId` is editor-runtime identity and is never trusted as AI interchange identity.

Nodera persists `noderaId` with blocks using the registered block attribute schema. IDs use `nd_` plus a bounded lower-case alphanumeric token. The editor reconciler assigns missing/invalid IDs and resolves duplicates produced by duplication/copy while preserving existing valid first occurrences.

Frontend rendering exposes a valid persisted ID as `data-nodera-id` using `WP_HTML_Tag_Processor`.
