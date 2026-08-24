export type NoderaBlock = {
	clientId?: string;
	name: string;
	attributes: Record<string, unknown>;
	innerBlocks: NoderaBlock[];
};

export type PatchOperation = {
	op: string;
	stableId?: string;
	parentStableId?: string | null;
	toParentStableId?: string | null;
	index?: number;
	attributes?: Record<string, unknown>;
	block?: NoderaBlock;
	blocks?: NoderaBlock[];
};

export type NoderaPatch = {
	schema: 'nodera-patch/v1';
	target: {
		kind: string;
		stableIds: string[];
		fingerprint: string;
	};
	operations: PatchOperation[];
};

export type ValidationResponse = {
	valid: boolean;
	fingerprint: string;
	candidate: NoderaBlock[];
	diff: Array<Record<string, unknown>>;
	quality: Array<Record<string, unknown>>;
};

declare global {
	interface Window {
		NoderaSettings?: {
			version: string;
			wordpress: string;
			restRoot: string;
			nonce: string;
			theme: string;
			breakpoints: Record<string, { label: string; maxWidth: string | number }>;
			nativeResponsive: boolean;
			nativeStyleStates: boolean;
			dynamicMeta: string;
			provider: {
				provider: string;
				model: string;
				endpoint: string;
				configured: boolean;
				hasApiKey: boolean;
				keySource: string;
			};
			settingsUrl: string;
		};
	}
}
