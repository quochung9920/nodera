# Third-party block contract adapters

Nodera reads live Gutenberg block registrations. Third-party blocks are visible as context but are **not AI-authorable by default**.

A trusted integration may opt a registered block into Nodera's authoring contract:

```php
add_action(
    'nodera_register_block_contract_adapters',
    static function ( \Nodera\Contracts\BlockContractRegistry $registry ): void {
        $registry->register_adapter(
            'vendor/example',
            array(
                'aiAuthorable' => true,
                'attributeAllowlist' => array( 'content', 'style', 'metadata', 'noderaId' ),
                'validateAttributes' => static function ( array $attributes, array $contract ): array {
                    unset( $contract );
                    if ( isset( $attributes['content'] ) && strlen( (string) $attributes['content'] ) > 10000 ) {
                        return array( 'valid' => false, 'code' => 'example_content_too_long', 'message' => 'Content is too long.' );
                    }
                    return array( 'valid' => true );
                },
            )
        );
    }
);
```

## Rules

- The block must already be registered in the WordPress block registry.
- `aiAuthorable` defaults to false.
- `attributeAllowlist` may only narrow the live registered schema; it does not invent attributes.
- Adapter validation runs in addition to Nodera's normal URL/CSS/binding/tree safety gates.
- Use `transformContract` only for safe machine-readable contract normalization; never put credentials or private runtime state into contracts.
- Adapters do not replace the block's native editor/rendering implementation.

## Ecosystem strategy

Nodera's built-in commercial readiness layer detects ACF and WooCommerce and can expose safe native Block Bindings sources. Block-library integrations such as Kadence, GenerateBlocks, Spectra or Stackable should ship dedicated adapters or be enabled through a reviewed site-specific adapter. Nodera deliberately does not guess third-party semantics.
