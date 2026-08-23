import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { PanelBody, TabPanel } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
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

function Sidebar() {
	const [device, setDevice] = useState('tablet');
	(window as unknown as { __noderaDevice?: [string, (value: string) => void] }).__noderaDevice = [device, setDevice];
	useEffect(() => startIdentityReconciler(), []);
	const state = useSelect((select: any) => {
		const blockEditor = select('core/block-editor');
		const editor = select('core/editor');
		const clientId = blockEditor.getSelectedBlockClientId();
		const blocks = blockEditor.getBlocks() as NoderaBlock[];
		const selected = clientId ? blockEditor.getBlock(clientId) as NoderaBlock : null;
		const parentIds = clientId ? blockEditor.getBlockParents(clientId) : [];
		const ancestors = parentIds.map((id: string) => blockEditor.getBlock(id)).filter(Boolean) as NoderaBlock[];
		const rootId = clientId ? blockEditor.getBlockRootClientId(clientId) : '';
		const siblings = clientId ? (blockEditor.getBlocks(rootId) as NoderaBlock[]).filter((block) => block.clientId !== clientId) : [];
		const settings = blockEditor.getSettings?.() || {};
		return {
			blocks,
			selected,
			ancestors,
			siblings,
			postId: Number(editor.getCurrentPostId()),
			postType: String(editor.getCurrentPostType?.() || ''),
			postTitle: String(editor.getEditedPostAttribute?.('title') || ''),
			meta: (editor.getEditedPostAttribute?.('meta') || {}) as Record<string,string>,
			design: { colors: settings.colors || [], gradients: settings.gradients || [], fontSizes: settings.fontSizes || [], spacingUnits: settings.spacingUnits || [] },
		};
	}, []);
	const blockActions = useDispatch('core/block-editor') as any;
	const editorActions = useDispatch('core/editor') as any;
	const target = state.selected ? [state.selected] : state.blocks;
	const updateSelected = (attributes: Record<string, unknown>) => state.selected?.clientId && blockActions.updateBlockAttributes(state.selected.clientId, attributes);
	const updateMeta = (value: string) => editorActions.editPost({ meta: { ...state.meta, [window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text']: value } });
	const tabs = [
		{ name: 'ai', title: __('AI', 'nodera') },
		{ name: 'responsive', title: __('Responsive', 'nodera') },
		{ name: 'design', title: __('Design', 'nodera') },
		{ name: 'dynamic', title: __('Dynamic', 'nodera') },
		{ name: 'advanced', title: __('Advanced', 'nodera') },
	];
	return <><PluginSidebarMoreMenuItem target="nodera-studio">{__('Nodera Studio', 'nodera')}</PluginSidebarMoreMenuItem><PluginSidebar name="nodera-studio" title={__('Nodera Studio', 'nodera')}><PanelBody initialOpen><TabPanel className="nodera-tabs" tabs={tabs}>{(tab) => {
		if (tab.name === 'ai') return <AiPanel blocks={state.blocks} target={target} ancestors={state.ancestors} siblings={state.siblings} postId={state.postId} postType={state.postType} postTitle={state.postTitle} design={state.design} />;
		if (tab.name === 'responsive') return <ResponsivePanel block={state.selected} update={updateSelected} />;
		if (tab.name === 'design') return <DesignPanel />;
		if (tab.name === 'dynamic') return <DynamicPanel block={state.selected} metaValue={String(state.meta[window.NoderaSettings?.dynamicMeta || 'nodera_dynamic_text'] || '')} updateBlock={updateSelected} updateMeta={updateMeta} />;
		return <AdvancedPanel block={state.selected} update={updateSelected} />;
	}}</TabPanel></PanelBody></PluginSidebar></>;
}

registerPlugin('nodera', { render: Sidebar });
