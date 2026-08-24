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

## Visual Fidelity 2.0 companion path

RC4 adds a richer transport layer when the external AI must understand rendered design rather than structure alone. It does not alter the canonical flow above.

1. **Nodera Visual AI** switches the existing Gutenberg editor canvas through native Desktop, Tablet and Mobile preview states using `core/editor`.
2. It measures the same-origin editor DOM/iframe and restores the user's original device state.
3. Visual Facts v2 records geometry, computed design facts, typography/media/semantic evidence and a parent/child layout graph. Ancestors and nearby siblings can be measured as read-only context without becoming editable stable IDs.
4. `/nodera/v1/design-context` contributes bounded/redacted resolved Global Settings, Global Styles and active-theme metadata.
5. Optional user-selected reference images are hashed/described and added to a local provider-neutral ZIP.
6. The normal `/ai/export` endpoint still performs target/fingerprint/scope validation and `ContextSanitizer` redaction. Visual media/CSS query credentials are removed during sanitization.
7. The ZIP combines the sanitized v1 session with prompt, visual manifest and best-effort Desktop/Tablet/Mobile PNG/SVG captures. These are companion files, not a new document schema.
8. External AI still returns exactly `nodera-patch/v1`, which follows the same standard import validator and Apply path.
9. After Apply, Visual QA can measure the three native previews again. A correction bundle performs a fresh export containing current QA issues for another no-API iteration.

```text
Gutenberg target
   ├─ structural contracts / target fingerprint
   ├─ resolved WordPress design system
   └─ native Desktop / Tablet / Mobile measurements
                    ↓
             sanitized v1 session
                    +
       visual captures / references / graph
                    ↓
             multimodal ZIP transport
                    ↓
               external AI
                    ↓
              nodera-patch/v1
                    ↓
          normal server validator
                    ↓
            explicit Gutenberg Apply
                    ↓
          native multi-viewport Visual QA
              ├─ PASS
              └─ fresh correction export
```

The visual/design fingerprints are trace evidence only. They do not replace the canonical target fingerprint and cannot grant a patch additional authority.

## Scope semantics

- `block`: only the selected block stable ID is editable. Descendants may appear as context but are not part of `target.stableIds`.
- `subtree`: the selected root and all descendants in the exported subtree are editable.
- `page`: the whole current Gutenberg page scope is editable.

The target fingerprint is computed from the exported target tree. If that tree changes before import/apply, Nodera rejects the stale patch.

## Portable session is not a second document

`nodera-ai-export/v1` and RC4 visual bundle files exist only to transport bounded context to an external AI. They never become canonical page state, never own history/revisions and are not re-rendered as a second editor document. Gutenberg `post_content` remains canonical at all times.

## Optional direct providers

`/nodera/v1/ai/generate` and the `nodera_ai_generate_patch` filter remain optional adapters for sites that want direct OpenAI/Anthropic/Gemini/OpenAI-compatible generation. They are not required for normal Nodera AI use.

Direct provider mode uses the same context sanitizer, fingerprint/scope rules and final `nodera-patch/v1` validator. Provider output never bypasses validation or explicit Apply.

Nodera does not silently transmit page content to a third-party model provider. Portable/visual export is initiated explicitly by the editor user, and direct transmission exists only when a site administrator deliberately configures a provider.
