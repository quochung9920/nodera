<?php
/**
 * Nodera responsive breakpoint registry.
 *
 * @package Nodera
 */

namespace Nodera\Responsive;

/**
 * Defines one canonical breakpoint configuration.
 */
final class BreakpointRegistry {
	/**
	 * Return responsive breakpoints.
	 */
	public function all(): array {
		return apply_filters(
			'nodera_breakpoints',
			array(
				'tablet' => array( 'label' => 'Tablet', 'maxWidth' => 1024 ),
				'mobile' => array( 'label' => 'Mobile', 'maxWidth' => 767 ),
			)
		);
	}
}
