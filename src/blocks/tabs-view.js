import { store } from '@wordpress/interactivity';

function activate(root, index, focus = false) {
	const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
	const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
	tabs.forEach((tab, tabIndex) => {
		const active = tabIndex === index;
		tab.setAttribute('aria-selected', active ? 'true' : 'false');
		tab.setAttribute('tabindex', active ? '0' : '-1');
		tab.classList.toggle('is-active', active);
		if (active && focus) tab.focus();
	});
	panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
}

store('nodera/tabs', {
	actions: {
		select(event) {
			const button = event.currentTarget;
			const root = button.closest('.nodera-tabs');
			if (!root) return;
			activate(root, Number(button.dataset.noderaTabIndex || 0));
		},
		keydown(event) {
			if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
			const button = event.currentTarget;
			const root = button.closest('.nodera-tabs');
			if (!root) return;
			const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
			const current = tabs.indexOf(button);
			let next = current;
			if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
			if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
			if (event.key === 'Home') next = 0;
			if (event.key === 'End') next = tabs.length - 1;
			event.preventDefault();
			activate(root, next, true);
		},
	},
});
