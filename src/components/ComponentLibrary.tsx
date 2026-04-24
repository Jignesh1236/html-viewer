import React from 'react';

export interface ComponentDefinition {
  id: string;
  category: string;
  name: string;
  icon: string;
  html: string;
  css?: string;
  description: string;
  editableProps?: string[];
}

export const COMPONENT_CATEGORIES = [
  { id: 'buttons', name: 'Buttons', icon: '🔘' },
  { id: 'forms', name: 'Forms', icon: '📝' },
  { id: 'cards', name: 'Cards', icon: '🃏' },
  { id: 'navigation', name: 'Navigation', icon: '🧭' },
  { id: 'layout', name: 'Layout', icon: '📐' },
  { id: 'typography', name: 'Typography', icon: '🔤' },
  { id: 'media', name: 'Media', icon: '🖼️' },
  { id: 'social', name: 'Social', icon: '🔗' },
];

export const COMPONENTS: ComponentDefinition[] = [
  // Buttons
  {
    id: 'btn-primary',
    category: 'buttons',
    name: 'Primary Button',
    icon: '🔘',
    description: 'Primary action button with hover effect',
    html: `<button class="btn btn-primary">Click Me</button>`,
    css: `.btn-primary { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; } .btn-primary:hover { background: #0056b3; }`,
    editableProps: ['background', 'color', 'padding', 'border-radius'],
  },
  {
    id: 'btn-secondary',
    category: 'buttons',
    name: 'Secondary Button',
    icon: '🔘',
    description: 'Secondary action button',
    html: `<button class="btn btn-secondary">Secondary</button>`,
    css: `.btn-secondary { background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; } .btn-secondary:hover { background: #545b62; }`,
    editableProps: ['background', 'color', 'padding', 'border-radius'],
  },
  {
    id: 'btn-outline',
    category: 'buttons',
    name: 'Outline Button',
    icon: '🔘',
    description: 'Button with outline style',
    html: `<button class="btn btn-outline">Outline</button>`,
    css: `.btn-outline { background: transparent; color: #007bff; padding: 10px 20px; border: 2px solid #007bff; border-radius: 4px; cursor: pointer; } .btn-outline:hover { background: #007bff; color: white; }`,
    editableProps: ['color', 'padding', 'border', 'border-radius'],
  },
  {
    id: 'btn-gradient',
    category: 'buttons',
    name: 'Gradient Button',
    icon: '🔘',
    description: 'Button with gradient background',
    html: `<button class="btn btn-gradient">Gradient</button>`,
    css: `.btn-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border: none; border-radius: 25px; cursor: pointer; } .btn-gradient:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }`,
    editableProps: ['background', 'color', 'padding', 'border-radius'],
  },

  // Forms
  {
    id: 'input-text',
    category: 'forms',
    name: 'Text Input',
    icon: '📝',
    description: 'Standard text input field',
    html: `<input type="text" class="form-input" placeholder="Enter text...">`,
    css: `.form-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; } .form-input:focus { outline: none; border-color: #007bff; }`,
    editableProps: ['width', 'padding', 'border', 'border-radius', 'font-size'],
  },
  {
    id: 'input-email',
    category: 'forms',
    name: 'Email Input',
    icon: '📝',
    description: 'Email input field with validation',
    html: `<input type="email" class="form-input" placeholder="email@example.com">`,
    css: `.form-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; } .form-input:focus { outline: none; border-color: #007bff; }`,
    editableProps: ['width', 'padding', 'border', 'border-radius', 'font-size'],
  },
  {
    id: 'textarea',
    category: 'forms',
    name: 'Text Area',
    icon: '📝',
    description: 'Multi-line text input',
    html: `<textarea class="form-textarea" rows="4" placeholder="Enter your message..."></textarea>`,
    css: `.form-textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical; } .form-textarea:focus { outline: none; border-color: #007bff; }`,
    editableProps: ['width', 'padding', 'border', 'border-radius', 'font-size'],
  },
  {
    id: 'checkbox',
    category: 'forms',
    name: 'Checkbox',
    icon: '📝',
    description: 'Checkbox input',
    html: `<label class="form-checkbox"><input type="checkbox"> Agree to terms</label>`,
    css: `.form-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; } .form-checkbox input { width: 18px; height: 18px; cursor: pointer; }`,
    editableProps: ['gap', 'font-size'],
  },

  // Cards
  {
    id: 'card-basic',
    category: 'cards',
    name: 'Basic Card',
    icon: '🃏',
    description: 'Simple card with title and content',
    html: `<div class="card"><div class="card-body"><h3 class="card-title">Card Title</h3><p class="card-text">Card content goes here.</p></div></div>`,
    css: `.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; } .card-body { padding: 20px; } .card-title { margin: 0 0 10px 0; font-size: 18px; } .card-text { color: #666; line-height: 1.5; }`,
    editableProps: ['background', 'border-radius', 'box-shadow', 'padding'],
  },
  {
    id: 'card-image',
    category: 'cards',
    name: 'Image Card',
    icon: '🃏',
    description: 'Card with image header',
    html: `<div class="card card-image"><div class="card-image-header"></div><div class="card-body"><h3 class="card-title">Image Card</h3><p class="card-text">Card with image header</p></div></div>`,
    css: `.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; } .card-image-header { height: 150px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); } .card-body { padding: 20px; } .card-title { margin: 0 0 10px 0; font-size: 18px; } .card-text { color: #666; line-height: 1.5; }`,
    editableProps: ['background', 'border-radius', 'box-shadow', 'padding'],
  },
  {
    id: 'card-hover',
    category: 'cards',
    name: 'Hover Card',
    icon: '🃏',
    description: 'Card with hover animation',
    html: `<div class="card card-hover"><div class="card-body"><h3 class="card-title">Hover Card</h3><p class="card-text">Hover me for effect</p></div></div>`,
    css: `.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; } .card-hover:hover { transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0,0,0,0.15); } .card-body { padding: 20px; } .card-title { margin: 0 0 10px 0; font-size: 18px; } .card-text { color: #666; line-height: 1.5; }`,
    editableProps: ['background', 'border-radius', 'box-shadow', 'padding'],
  },

  // Navigation
  {
    id: 'nav-basic',
    category: 'navigation',
    name: 'Basic Nav',
    icon: '🧭',
    description: 'Simple navigation bar',
    html: `<nav class="nav"><a href="#" class="nav-link">Home</a><a href="#" class="nav-link">About</a><a href="#" class="nav-link">Contact</a></nav>`,
    css: `.nav { display: flex; gap: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; } .nav-link { text-decoration: none; color: #333; font-weight: 500; } .nav-link:hover { color: #007bff; }`,
    editableProps: ['background', 'gap', 'padding', 'border-radius'],
  },
  {
    id: 'nav-pills',
    category: 'navigation',
    name: 'Pill Nav',
    icon: '🧭',
    description: 'Navigation with pill style links',
    html: `<nav class="nav nav-pills"><a href="#" class="nav-link active">Home</a><a href="#" class="nav-link">About</a><a href="#" class="nav-link">Contact</a></nav>`,
    css: `.nav { display: flex; gap: 10px; padding: 15px; } .nav-pills .nav-link { padding: 8px 16px; background: #e9ecef; border-radius: 20px; text-decoration: none; color: #333; font-weight: 500; } .nav-pills .nav-link.active, .nav-pills .nav-link:hover { background: #007bff; color: white; }`,
    editableProps: ['gap', 'padding', 'background'],
  },

  // Layout
  {
    id: 'container',
    category: 'layout',
    name: 'Container',
    icon: '📐',
    description: 'Centered container with max-width',
    html: `<div class="container"><p>Content inside container</p></div>`,
    css: `.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }`,
    editableProps: ['max-width', 'margin', 'padding'],
  },
  {
    id: 'grid-2',
    category: 'layout',
    name: '2-Column Grid',
    icon: '📐',
    description: 'Two column grid layout',
    html: `<div class="grid grid-2"><div class="grid-item">Column 1</div><div class="grid-item">Column 2</div></div>`,
    css: `.grid { display: grid; gap: 20px; } .grid-2 { grid-template-columns: 1fr 1fr; } .grid-item { padding: 20px; background: #f8f9fa; border-radius: 4px; }`,
    editableProps: ['gap', 'grid-template-columns'],
  },
  {
    id: 'grid-3',
    category: 'layout',
    name: '3-Column Grid',
    icon: '📐',
    description: 'Three column grid layout',
    html: `<div class="grid grid-3"><div class="grid-item">Column 1</div><div class="grid-item">Column 2</div><div class="grid-item">Column 3</div></div>`,
    css: `.grid { display: grid; gap: 20px; } .grid-3 { grid-template-columns: repeat(3, 1fr); } .grid-item { padding: 20px; background: #f8f9fa; border-radius: 4px; }`,
    editableProps: ['gap', 'grid-template-columns'],
  },
  {
    id: 'flex-row',
    category: 'layout',
    name: 'Flex Row',
    icon: '📐',
    description: 'Horizontal flex container',
    html: `<div class="flex flex-row"><div class="flex-item">Item 1</div><div class="flex-item">Item 2</div><div class="flex-item">Item 3</div></div>`,
    css: `.flex { display: flex; } .flex-row { flex-direction: row; gap: 15px; } .flex-item { padding: 15px; background: #f8f9fa; border-radius: 4px; flex: 1; }`,
    editableProps: ['gap', 'flex-direction'],
  },
  {
    id: 'flex-center',
    category: 'layout',
    name: 'Flex Center',
    icon: '📐',
    description: 'Centered flex container',
    html: `<div class="flex flex-center"><div class="flex-item">Centered Content</div></div>`,
    css: `.flex { display: flex; } .flex-center { justify-content: center; align-items: center; min-height: 100px; } .flex-item { padding: 20px; background: #f8f9fa; border-radius: 4px; }`,
    editableProps: ['justify-content', 'align-items', 'min-height'],
  },

  // Typography
  {
    id: 'heading-h1',
    category: 'typography',
    name: 'Heading H1',
    icon: '🔤',
    description: 'Large heading',
    html: `<h1 class="heading-h1">Heading 1</h1>`,
    css: `.heading-h1 { font-size: 36px; font-weight: 700; margin: 0 0 20px 0; color: #333; }`,
    editableProps: ['font-size', 'font-weight', 'color', 'margin'],
  },
  {
    id: 'heading-h2',
    category: 'typography',
    name: 'Heading H2',
    icon: '🔤',
    description: 'Medium heading',
    html: `<h2 class="heading-h2">Heading 2</h2>`,
    css: `.heading-h2 { font-size: 28px; font-weight: 600; margin: 0 0 15px 0; color: #333; }`,
    editableProps: ['font-size', 'font-weight', 'color', 'margin'],
  },
  {
    id: 'paragraph',
    category: 'typography',
    name: 'Paragraph',
    icon: '🔤',
    description: 'Standard paragraph text',
    html: `<p class="paragraph">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
    css: `.paragraph { font-size: 16px; line-height: 1.6; color: #555; margin: 0 0 15px 0; }`,
    editableProps: ['font-size', 'line-height', 'color', 'margin'],
  },
  {
    id: 'blockquote',
    category: 'typography',
    name: 'Blockquote',
    icon: '🔤',
    description: 'Styled blockquote',
    html: `<blockquote class="blockquote">This is a blockquote</blockquote>`,
    css: `.blockquote { border-left: 4px solid #007bff; padding-left: 20px; margin: 20px 0; font-style: italic; color: #555; }`,
    editableProps: ['border-left', 'padding-left', 'margin', 'color'],
  },

  // Media
  {
    id: 'image-responsive',
    category: 'media',
    name: 'Responsive Image',
    icon: '🖼️',
    description: 'Responsive image container',
    html: `<div class="image-container"><img src="https://via.placeholder.com/800x400" alt="Placeholder" class="responsive-img"></div>`,
    css: `.image-container { width: 100%; } .responsive-img { max-width: 100%; height: auto; display: block; border-radius: 4px; }`,
    editableProps: ['max-width', 'border-radius'],
  },
  {
    id: 'video-container',
    category: 'media',
    name: 'Video Container',
    icon: '🖼️',
    description: 'Responsive video embed',
    html: `<div class="video-container"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe></div>`,
    css: `.video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; } .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }`,
    editableProps: ['padding-bottom'],
  },

  // Social
  {
    id: 'social-icons',
    category: 'social',
    name: 'Social Icons',
    icon: '🔗',
    description: 'Social media icon links',
    html: `<div class="social-icons"><a href="#" class="social-icon">📘</a><a href="#" class="social-icon">🐦</a><a href="#" class="social-icon">📸</a><a href="#" class="social-icon">💼</a></div>`,
    css: `.social-icons { display: flex; gap: 15px; } .social-icon { font-size: 24px; text-decoration: none; transition: transform 0.2s; } .social-icon:hover { transform: scale(1.2); }`,
    editableProps: ['gap', 'font-size'],
  },
  {
    id: 'share-buttons',
    category: 'social',
    name: 'Share Buttons',
    icon: '🔗',
    description: 'Social share buttons',
    html: `<div class="share-buttons"><button class="share-btn share-facebook">Share</button><button class="share-btn share-twitter">Tweet</button></div>`,
    css: `.share-buttons { display: flex; gap: 10px; } .share-btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; color: white; font-weight: 500; } .share-facebook { background: #1877f2; } .share-twitter { background: #1da1f2; } .share-btn:hover { opacity: 0.9; }`,
    editableProps: ['gap', 'padding', 'border-radius'],
  },
];

export const getComponentsByCategory = (categoryId: string): ComponentDefinition[] => {
  return COMPONENTS.filter(c => c.category === categoryId);
};

export const getComponentById = (id: string): ComponentDefinition | undefined => {
  return COMPONENTS.find(c => c.id === id);
};
