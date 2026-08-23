<?php
/**
 * Accordion render template.
 *
 * @package Nodera
 */

$nodera_accordion_uid      = wp_unique_id( 'nodera-accordion-' );
$nodera_accordion_panel_id = $nodera_accordion_uid . '-panel';
$nodera_accordion_title    = (string) ( $attributes['title'] ?? '' );
$nodera_accordion_content  = (string) ( $attributes['content'] ?? '' );
?>
<div <?php echo get_block_wrapper_attributes( array( 'class' => 'nodera-accordion', 'data-wp-interactive' => 'nodera/accordion' ) ); ?>>
	<h3 class="nodera-accordion__heading">
		<button type="button" class="nodera-accordion__trigger" aria-expanded="false" aria-controls="<?php echo esc_attr( $nodera_accordion_panel_id ); ?>" data-wp-on--click="actions.toggle">
			<?php echo esc_html( $nodera_accordion_title ); ?>
		</button>
	</h3>
	<div id="<?php echo esc_attr( $nodera_accordion_panel_id ); ?>" class="nodera-accordion__panel" hidden>
		<?php echo wp_kses_post( $nodera_accordion_content ); ?>
	</div>
</div>
