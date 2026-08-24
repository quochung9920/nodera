# AI architecture

## Primary provider-neutral portable flow

1. User selects a Gutenberg block, selected subtree, or page scope.
2. Nodera resolves persistent IDs only for the editable scope actually requested.
3. Browser code captures bounded visual facts when editor DOM nodes are measurable.
4. Nodera builds `nodera-ai-context/v1` from live Gutenberg state, registered block contracts, Global Style facts and the requested scope.
5. The editor posts that context to `/nodera/v1/ai/export`. WordPress verifies the target fingerprint/scope and runs `ContextSanitizer` before anything is exported.
6. WordPress returns a temporary portable `nodera-ai-export/v1` session containing a session ID, sanitized context, target fingerprint/stable IDs and strict `nodera-patch/v1` output rules.
7. The user copies/downloads the session and sends it to any external AI. No API key is required inside Nodera.
8. The external AI returns exactly one `nodera-patch/v1` object, not a replacement page/session document.
9. The user pastes or uploads that patch under **Import AI Result**.
10. `/nodera/v1/ai/validate` treats the imported JSON as untrusted and validates schema, fingerprint, editable scope, operations, block authorability, registered attributes, URL/CSS restrictions and candidate relationships.
11. Nodera builds an in-memory candidate tree and returns semantic diff and deterministic quality findings.
12. The user explicitly applies the already-validated patch through `core/block-editor` dispatch.
13. Native Gutenberg history owns Undo/Redo. The user still has to Save/Update the post.

```text
Gutenberg post_content (canonical)
        ↓
Selected block / subtree / page
        ↓
nodera-ai-context/v1
        ↓
server scope/fingerprint verification
        ↓
ContextSanitizer
        ↓
nodera-ai-export/v1   ← temporary portable session only
        ↓
External AI of the user's choice
        ↓
nodera-patch/v1
        ↓
strict server validation
        ↓
candidate + diff + quality
        ↓
explicit Apply to Gutenberg
        ↓
native Undo / Save / revisions
```

## Scope semantics

- `block`: only the selected block stable ID is editable. Descendants may appear as context but are not part of `target.stableIds`.
- `subtree`: the selected root and all descendants in the exported subtree are editable.
- `page`: the whole current Gutenberg page scope is editable.

The fingerprint is computed from the exported target tree. If that tree changes before import/apply, Nodera rejects the stale patch.

## Portable session is not a second document

`nodera-ai-export/v1` exists only to transport bounded context to an external AI. It never becomes the canonical page state, never owns history/revisions and is not re-rendered as a second editor document. Gutenberg `post_content` remains canonical at all times.

## Optional direct providers

`/nodera/v1/ai/generate` and the `nodera_ai_generate_patch` filter remain optional adapters for sites that want direct OpenAI/Anthropic/Gemini/OpenAI-compatible generation. They are not required for normal Nodera AI use.

Direct provider mode uses the same context sanitizer, fingerprint/scope rules and final `nodera-patch/v1` validator. Provider output never bypasses validation or explicit Apply.

Nodera does not silently transmit page content to a third-party model provider. Portable export is initiated explicitly by the editor user, and direct transmission exists only when a site administrator deliberately configures a provider.
