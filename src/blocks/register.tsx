import { registerBlockType } from '@wordpress/blocks';
import { RichText } from '@wordpress/block-editor';
import { Button, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import accordion from '../../blocks/accordion/block.json';
import tabs from '../../blocks/tabs/block.json';

function AccordionEdit({ attributes, setAttributes }: any) {
	return <div className="nodera-accordion-editor"><TextControl label={__('Accordion title', 'nodera')} value={attributes.title || ''} onChange={(title)=>setAttributes({title})} /><RichText tagName="div" value={attributes.content || ''} onChange={(content)=>setAttributes({content})} placeholder={__('Accordion content…', 'nodera')} /></div>;
}

function TabsEdit({ attributes, setAttributes }: any) {
	const items = Array.isArray(attributes.items) ? attributes.items : [];
	const update = (index: number, key: string, value: string) => setAttributes({ items: items.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, [key]: value } : item) });
	return <div className="nodera-tabs-editor">{items.map((item: any, index: number)=><div className="nodera-tab-editor" key={index}><TextControl label={__('Tab label', 'nodera')} value={item.label || ''} onChange={(value)=>update(index,'label',value)} /><RichText tagName="div" value={item.content || ''} onChange={(value)=>update(index,'content',value)} /><Button isDestructive variant="tertiary" onClick={()=>setAttributes({items:items.filter((_:unknown,i:number)=>i!==index)})}>{__('Remove tab', 'nodera')}</Button></div>)}<Button variant="secondary" onClick={()=>setAttributes({items:[...items,{label:__('New tab','nodera'),content:''}]})}>{__('Add tab', 'nodera')}</Button></div>;
}

registerBlockType(accordion.name, { ...accordion, edit: AccordionEdit, save: () => null } as any);
registerBlockType(tabs.name, { ...tabs, edit: TabsEdit, save: () => null } as any);
