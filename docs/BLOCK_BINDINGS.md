# Block Bindings

Nodera Dynamic Data uses native WordPress Block Bindings metadata. It does not maintain a parallel data-binding engine.

Built-in/editor sources:

- `core/post-meta` using Nodera's REST-visible `nodera_dynamic_text` key;
- `core/post-data` for safe post date/modified/permalink workflows;
- `nodera/acf-field` when ACF is detected, resolving one explicitly named scalar field for the current post;
- `nodera/woocommerce-product` when WooCommerce is detected, limited to `name`, `sku`, `price`, `regular_price`, `sale_price`, `stock_status` and `permalink`.

Private/unpublished content remains capability-protected; published frontend content can resolve the optional ACF/WooCommerce sources for normal rendering.

No generic `wp_options`, arbitrary object graph, credential store or unrestricted product/meta access is exposed. AI-authored bindings remain deliberately narrower than manual editor bindings until a binding source has an explicit reviewed AI policy.
