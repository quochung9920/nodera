# AI architecture

Flow:

1. User chooses a block subtree or page.
2. Nodera resolves persistent IDs.
3. Nodera captures bounded browser visual facts where available.
4. Nodera exports `nodera-ai-context/v1`.
5. External AI returns `nodera-patch/v1`.
6. Nodera normalizes and validates schema, target fingerprint, scope and authorable block types.
7. User explicitly applies the patch through `core/block-editor` operations.
8. Apply remains local until the user saves the WordPress post.

Nodera does not transmit content to a third-party model in v0.1. External AI usage is initiated by the user through Copy for AI.
