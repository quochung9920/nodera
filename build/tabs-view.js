import { store } from '@wordpress/interactivity';
function activate(root, index, focus) {
	const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
	const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
	tabs.forEach((tab, i) => {
		const active = i === index;
		tab.setAttribute('aria-selected', active ? 'true' : 'false');
		tab.setAttribute('tabindex', active ? '0' : '-1');
		tab.classList.toggle('is-active', active);
		if (active && focus) tab.focus();
	});
	panels.forEach((panel, i) => { panel.hidden = i !== index; });
}
store('nodera/tabs', {
	actions: {
		select(event) {
			const tab = event.currentTarget;
			const root = tab.closest('.nodera-tabs');
			if (!root) return;
			activate(root, Number(tab.dataset.noderaTabIndex || 0), false);
		},
		keydown(event) {
			if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
			const tab = event.currentTarget;
			const root = tab.closest('.nodera-tabs');
			if (!root) return;
			const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
			let index = tabs.indexOf(tab);
			if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
			if (event.key === 'ArrowLeft') index = (index - 1 + tabs.length) % tabs.length;
			if (event.key === 'Home') index = 0;
			if (event.key === 'End') index = tabs.length - 1;
			event.preventDefault();
			activate(root, index, true);
		},
	},
});
