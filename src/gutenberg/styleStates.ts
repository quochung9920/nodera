export type StyleObject = Record<string, unknown>;

export function cloneStyle(value: unknown): StyleObject {
	return value && typeof value === 'object' && !Array.isArray(value)
		? JSON.parse(JSON.stringify(value)) as StyleObject
		: {};
}

export function getStyleValue(style: unknown, path: string[]): string {
	let cursor: unknown = style;
	for (const segment of path) {
		if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return '';
		cursor = (cursor as StyleObject)[segment];
	}
	return typeof cursor === 'string' || typeof cursor === 'number' ? String(cursor) : '';
}

export function setStyleValue(style: unknown, path: string[], value: string): StyleObject {
	const next = cloneStyle(style);
	let cursor = next;
	path.forEach((segment, index) => {
		if (index === path.length - 1) {
			if (value.trim()) cursor[segment] = value.trim();
			else delete cursor[segment];
			return;
		}
		const child = cursor[segment];
		cursor[segment] = child && typeof child === 'object' && !Array.isArray(child)
			? { ...(child as StyleObject) }
			: {};
		cursor = cursor[segment] as StyleObject;
	});
	return pruneEmpty(next);
}

export function pruneEmpty(value: StyleObject): StyleObject {
	const out: StyleObject = {};
	for (const [key, item] of Object.entries(value)) {
		if (item && typeof item === 'object' && !Array.isArray(item)) {
			const child = pruneEmpty(item as StyleObject);
			if (Object.keys(child).length) out[key] = child;
		} else if (item !== '' && item !== null && item !== undefined) {
			out[key] = item;
		}
	}
	return out;
}

const legacyResponsivePaths: Record<string, string[]> = {
	paddingTop: ['spacing', 'padding', 'top'],
	paddingRight: ['spacing', 'padding', 'right'],
	paddingBottom: ['spacing', 'padding', 'bottom'],
	paddingLeft: ['spacing', 'padding', 'left'],
	marginTop: ['spacing', 'margin', 'top'],
	marginRight: ['spacing', 'margin', 'right'],
	marginBottom: ['spacing', 'margin', 'bottom'],
	marginLeft: ['spacing', 'margin', 'left'],
	gap: ['spacing', 'blockGap'],
	width: ['dimensions', 'width'],
	minWidth: ['dimensions', 'minWidth'],
	fontSize: ['typography', 'fontSize'],
	lineHeight: ['typography', 'lineHeight'],
};

export function responsivePath(device: 'tablet' | 'mobile', key: string): string[] | null {
	const path = legacyResponsivePaths[key];
	return path ? [`@${device}`, ...path] : null;
}

export function pseudoPath(state: 'hover' | 'focus' | 'focus-visible' | 'active', group: 'color', key: 'text' | 'background'): string[] {
	return [`:${state}`, group, key];
}

export function migrateLegacyResponsive(
	style: unknown,
	legacy: Record<string, Record<string, string>>,
): StyleObject {
	let next = cloneStyle(style);
	for (const device of ['tablet', 'mobile'] as const) {
		for (const [key, value] of Object.entries(legacy[device] || {})) {
			const path = responsivePath(device, key);
			if (path && value) next = setStyleValue(next, path, value);
		}
	}
	return next;
}
