# Block Bindings

Nodera Dynamic Data uses WordPress Block Bindings metadata. The initial safe workflow registers the REST-visible `nodera_dynamic_text` post-meta key on REST-enabled post types and allows Heading/Paragraph content to connect to `core/post-meta`.

No generic `wp_options` exposure exists. Future ACF, WooCommerce or other providers should register narrow allowlisted adapters rather than bypassing the native bindings architecture.
