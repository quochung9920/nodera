# nodera-ai-context/v1

A transient projection of a Gutenberg editing task. It is not document storage.

Core fields: `schema`, `task`, `target`, `document`, `context`, `contracts`, `design`, `visualFacts`, `environment`, `limits`, `output`.

`target.fingerprint` hashes only the editable target's stable block structure/attributes, excluding runtime `clientId` and browser measurements. Context ancestors/siblings may be exported for reasoning without becoming editable.

`visualFacts.browser.measuredGeometry` is always explicit. Unavailable measurement is reported as unavailable; server code does not fabricate geometry.
