export type NoderaBlock = {
	clientId?: string;
	name: string;
	attributes: Record<string, any>;
	innerBlocks: NoderaBlock[];
};

export type NoderaTargetKind = 'block' | 'subtree' | 'selection' | 'page';

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
	target: { kind: NoderaTargetKind; stableIds: string[]; fingerprint: string };
	operations: PatchOperation[];
};

export type NoderaAiExport = {
	schema: 'nodera-ai-export/v1';
	sessionId: string;
	exportedAt: string;
	noderaVersion: string;
	wordpressVersion: string;
	target: NoderaPatch['target'];
	task: Record<string, unknown>;
	context: Record<string, any>;
	outputRequirements: {
		schema: 'nodera-patch/v1';
		rules: string[];
	};
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
			releaseStatus?: string;
			wordpress: string;
			restRoot: string;
			nonce: string;
			theme: string;
			breakpoints: Record<string, { label: string; maxWidth: number }>;
			dynamicMeta: string;
			nativeResponsive: boolean;
			nativePseudoStates: string[];
			aiProvider: { configured: boolean; provider: string; model: string; source?: string };
			settingsUrl: string;
		};
	}
}
