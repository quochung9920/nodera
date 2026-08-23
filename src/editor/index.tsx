import { BlockControls, InspectorControls } from '@wordpress/block-editor';
import {
	Dropdown,
	Notice,
	PanelBody,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { PluginSidebar } from '@wordpress/editor';
import { useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import type { NoderaBlock } from '../types';
import { startIdentityReconciler } from '../identity';
import { AiPanel } from '../ai/components/AiPanel';
import { ResponsivePanel } from '../responsive/ResponsivePanel';
import { DynamicPanel } from '../bindings/DynamicPanel';
import { DesignPanel } from '../design/DesignPanel';
import { AdvancedPanel } from '../advanced/AdvancedPanel';
import '../blocks/register';
import '../editor.css';

type EditorContext = {
	blocks: NoderaBlock[];
	selected: NoderaBlock | null;
	ancestors: NoderaBlock[];
	siblings: NoderaBlock[];
	postId: number;
	postType: string;
	postTitle: string;
	meta: Record<string, string>;
	design: Record<string, unknown>;
};

function useEditorContext(clientId?: string): EditorContext {
	return useSelect((select: any) => {
		const blockEditor = select('core/block-editor');
		const editor = select('core/editor');
		const resolvedClientId = clientId || blockEditor.getSelectedBlockClientId();
		const blocks = (blockEditor.getBlocks() || []) as NoderaBlock[];
		const selected = resolvedClientId ? blockEditor.getBlock(resolvedClientId) as NoderaBlock : null;
		const parentIds = resolvedClientId ? blockEditor.getBlockParents(resolvedClientId) : [];
		const ancestors = parentIds.map((id: string) => blockEditor.getBlock(id)).filter(Boolean) as NoderaBlock[];
		const rootId = resolvedClientId ? blockEditor.getBlockRootClientId(resolvedClientId) : '';
		const siblings = resolvedClientId
			? (blockEditor.getBlocks(rootId) as NoderaBlock[]).filter((block) => block.clientId !== resolvedClientId)
			: [];
		const settings = blockEditor.getSettings?.() || {};
		return {
			blocks,
			selected,
			ancestors,
			siblings,
			postId: Number(editor.getCurrentPostId()),
			postType: String(editor.getCurrentPostType?.() || ''),
			postTitle: String(editor.getEditedPostAttribute?.('title') || ''),
			meta: (editor.getEditedPostAttribute?.('meta') || {}) as Record<string, string>,
			design: {
				colors: settings.colors || [],
				gradients: settings.gradients || [],
				fontSizes: settings.fontSizes || [],
				spacingUnits: settings.spacingUnits || [],
			},
		};
	}, [clientId]);
}

function BlockAi({ context }: { context: EditorContext }) {
	if (!context.selected) return null;
	return (
		<AiPanel
			blocks={context.blocks}
			target={[context.selected]}
			ancestors={context.ancestors}
			siblings={context.siblings}
			postId={context.postId}
			postType={context.postType}
			postTitle={context.postTitle}
			design={context.design}
		/>
	);
}

function SelectedBlockNoderaControls(props: any) {
	const [device, setDevice] = useState<'tablet' | 'mobile'>('tablet');
	const context = useEditorContext(props.clientId);
	const editorActions = useDispatch('core/editor') as any;
	if (!context.selected) return null;

	const updateBlock = (attributes: Record<string, unknown>) => props.setAttributes(attributes);
	const updateMeta = (value: string) => {
		const key = window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text';
		editorActions.editPost({ meta: { ...context.meta, [key]: value } });
	};

	return (
		<>
			<BlockControls group="other">
				<ToolbarGroup>
					<Dropdown
						popoverProps={{ placement: 'bottom-start', className: 'nodera-ai-popover' }}
						renderToggle={({ isOpen, onToggle }) => (
							<ToolbarButton
								icon="superhero-alt"
								label={__('Nodera AI', 'nodera')}
								isPressed={isOpen}
								onClick={onToggle}
							>
								{__('AI', 'nodera')}
							</ToolbarButton>
						)}
						renderContent={() => (
							<div className="nodera-toolbar-ai">
								<BlockAi context={context} />
							</div>
						)}
					/>
				</ToolbarGroup>
			</BlockControls>

			<InspectorControls>
				<PanelBody title={__('✦ Nodera AI', 'nodera')} initialOpen={false}>
					<BlockAi context={context} />
				</PanelBody>
				<PanelBody title={__('Responsive', 'nodera')} initialOpen={false}>
					<ResponsivePanel block={context.selected} device={device} setDevice={setDevice} update={updateBlock} />
				</PanelBody>
				<PanelBody title={__('Dynamic Data', 'nodera')} initialOpen={false}>
					<DynamicPanel
						block={context.selected}
						metaValue={String(context.meta[window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text'] || '')}
						updateBlock={updateBlock}
						updateMeta={updateMeta}
					/>
				</PanelBody>
				<PanelBody title={__('States & Effects', 'nodera')} initialOpen={false}>
					<AdvancedPanel block={context.selected} update={updateBlock} />
				</PanelBody>
			</InspectorControls>
		</>
	);
}

function withNoderaGutenbergControls(BlockEdit: any) {
	return function NoderaEnhancedBlockEdit(props: any) {
		return (
			<>
				<BlockEdit {...props} />
				{props.isSelected ? <SelectedBlockNoderaControls {...props} /> : null}
			</>
		);
	};
}

function PageNodera() {
	const context = useEditorContext();
	useEffect(() => startIdentityReconciler(), []);

	return (
		<PluginSidebar name="nodera-page-tools" title={__('Nodera', 'nodera')} icon="superhero-alt">
			<PanelBody title={__('Build Page with AI', 'nodera')} initialOpen={false}>
				<AiPanel
					blocks={context.blocks}
					target={context.blocks}
					ancestors={[]}
					siblings={[]}
					postId={context.postId}
					postType={context.postType}
					postTitle={context.postTitle}
					design={context.design}
				/>
			</PanelBody>
			<PanelBody title={__('Global Design', 'nodera')} initialOpen={false}>
				<DesignPanel />
			</PanelBody>
			<PanelBody title={__('Gutenberg-native workflow', 'nodera')} initialOpen>
				<Notice status="info" isDismissible={false}>
					{__('Select any Gutenberg block to use Nodera AI, Responsive, Dynamic Data and States directly inside the native Block sidebar. Base styles, List View, Undo/Redo, Save, revisions and rendering remain owned by Gutenberg/WordPress.', 'nodera')}
				</Notice>
			</PanelBody>
		</PluginSidebar>
	);
}

addFilter('editor.BlockEdit', 'nodera/gutenberg-native-controls', withNoderaGutenbergControls);
registerPlugin('nodera', { render: PageNodera });
