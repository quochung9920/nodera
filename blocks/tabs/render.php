<?php
/**
 * Tabs render template.
 *
 * @package Nodera
 */

$nodera_tabs_uid   = wp_unique_id( 'nodera-tabs-' );
$nodera_tabs_items = is_array( $attributes['items'] ?? null ) ? array_values( $attributes['items'] ) : array();
?>
<div <?php echo get_block_wrapper_attributes( array( 'class' => 'nodera-tabs', 'data-wp-interactive' => 'nodera/tabs' ) ); ?>>
	<div class="nodera-tabs__list" role="tablist" aria-label="<?php echo esc_attr__( 'Content tabs', 'nodera' ); ?>">
		<?php foreach ( $nodera_tabs_items as $nodera_tabs_index => $nodera_tabs_item ) : ?>
			<?php
			$nodera_tabs_tab_id   = $nodera_tabs_uid . '-tab-' . $nodera_tabs_index;
			$nodera_tabs_panel_id = $nodera_tabs_uid . '-panel-' . $nodera_tabs_index;
			?>
			<button id="<?php echo esc_attr( $nodera_tabs_tab_id ); ?>" type="button" role="tab" class="nodera-tabs__tab<?php echo 0 === $nodera_tabs_index ? ' is-active' : ''; ?>" aria-selected="<?php echo 0 === $nodera_tabs_index ? 'true' : 'false'; ?>" aria-controls="<?php echo esc_attr( $nodera_tabs_panel_id ); ?>" tabindex="<?php echo 0 === $nodera_tabs_index ? '0' : '-1'; ?>" data-nodera-tab-index="<?php echo esc_attr( (string) $nodera_tabs_index ); ?>" data-wp-on--click="actions.select" data-wp-on--keydown="actions.keydown">
				<?php echo esc_html( (string) ( $nodera_tabs_item['label'] ?? '' ) ); ?>
			</button>
		<?php endforeach; ?>
	</div>
	<?php foreach ( $nodera_tabs_items as $nodera_tabs_index => $nodera_tabs_item ) : ?>
		<?php
		$nodera_tabs_tab_id   = $nodera_tabs_uid . '-tab-' . $nodera_tabs_index;
		$nodera_tabs_panel_id = $nodera_tabs_uid . '-panel-' . $nodera_tabs_index;
		?>
		<div id="<?php echo esc_attr( $nodera_tabs_panel_id ); ?>" class="nodera-tabs__panel" role="tabpanel" aria-labelledby="<?php echo esc_attr( $nodera_tabs_tab_id ); ?>"<?php echo 0 === $nodera_tabs_index ? '' : ' hidden'; ?>>
			<?php echo wp_kses_post( (string) ( $nodera_tabs_item['content'] ?? '' ) ); ?>
		</div>
	<?php endforeach; ?>
</div>
