import { store } from '@wordpress/interactivity';
store('nodera/accordion', {
	actions: {
		toggle(event) {
			const button = event.currentTarget;
			const root = button.closest('.nodera-accordion');
			if (!root) return;
			const panel = root.querySelector('.nodera-accordion__panel');
			if (!panel) return;
			const next = button.getAttribute('aria-expanded') !== 'true';
			button.setAttribute('aria-expanded', next ? 'true' : 'false');
			panel.hidden = !next;
		},
	},
});
