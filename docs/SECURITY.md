# Security

AI output is hostile input by default.

Controls include schema/version checks, 512 KiB patch limit, 200-operation limit, strict top-level/operation fields, target fingerprints, explicit editable IDs, registered block contracts, conservative AI block authorability, attribute type checks and candidate duplicate-ID detection.

REST contract reads require `edit_posts`; AI validation requires `edit_post` for the requested post. Native Global Styles writes remain protected by the WordPress core REST controller/capabilities.

No credentials, cookies, REST nonces or provider API keys are included in AI exports. v0.1 performs no automatic third-party AI transmission.
