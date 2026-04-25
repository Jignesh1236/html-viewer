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
  { id: 'hero', name: 'Hero Sections', icon: '🎯' },
  { id: 'features', name: 'Features', icon: '✨' },
  { id: 'testimonials', name: 'Testimonials', icon: '💬' },
  { id: 'pricing', name: 'Pricing', icon: '💰' },
  { id: 'footers', name: 'Footers', icon: '📄' },
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

  // Hero Sections
  {
    id: 'hero-center',
    category: 'hero',
    name: 'Centered Hero',
    icon: '🎯',
    description: 'Centered hero section with CTA',
    html: `<section class="hero hero-center"><div class="hero-content"><h1 class="hero-title">Build Something Amazing</h1><p class="hero-subtitle">Create beautiful websites with our powerful editor</p><button class="hero-cta">Get Started</button></div></section>`,
    css: `.hero { padding: 100px 20px; text-align: center; } .hero-center { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; } .hero-title { font-size: 48px; font-weight: 700; margin: 0 0 20px 0; } .hero-subtitle { font-size: 20px; margin: 0 0 30px 0; opacity: 0.9; } .hero-cta { padding: 15px 40px; background: white; color: #667eea; border: none; border-radius: 30px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; } .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }`,
    editableProps: ['padding', 'background', 'color'],
  },
  {
    id: 'hero-split',
    category: 'hero',
    name: 'Split Hero',
    icon: '🎯',
    description: 'Hero with text on left, image on right',
    html: `<section class="hero hero-split"><div class="hero-left"><h1 class="hero-title">Transform Your Ideas</h1><p class="hero-subtitle">Build stunning websites in minutes with our intuitive drag-and-drop editor.</p><button class="hero-cta">Start Free Trial</button></div><div class="hero-right"><div class="hero-image"></div></div></section>`,
    css: `.hero { display: flex; align-items: center; padding: 80px 40px; gap: 60px; } .hero-split { background: #f8f9fa; } .hero-left { flex: 1; } .hero-right { flex: 1; } .hero-title { font-size: 42px; font-weight: 700; margin: 0 0 20px 0; color: #333; } .hero-subtitle { font-size: 18px; margin: 0 0 30px 0; color: #666; line-height: 1.6; } .hero-cta { padding: 14px 32px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; } .hero-cta:hover { background: #5568d3; transform: translateY(-2px); } .hero-image { height: 300px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; }`,
    editableProps: ['gap', 'padding', 'background'],
  },

  // Features
  {
    id: 'feature-grid-3',
    category: 'features',
    name: '3-Column Features',
    icon: '✨',
    description: 'Grid of 3 feature cards',
    html: `<section class="features-section"><div class="feature-grid"><div class="feature-card"><div class="feature-icon">⚡</div><h3 class="feature-title">Lightning Fast</h3><p class="feature-desc">Optimized for speed and performance</p></div><div class="feature-card"><div class="feature-icon">🎨</div><h3 class="feature-title">Beautiful Design</h3><p class="feature-desc">Stunning templates and components</p></div><div class="feature-card"><div class="feature-icon">🔒</div><h3 class="feature-title">Secure</h3><p class="feature-desc">Enterprise-grade security built-in</p></div></div></section>`,
    css: `.features-section { padding: 80px 40px; } .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 1200px; margin: 0 auto; } .feature-card { padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; transition: transform 0.2s; } .feature-card:hover { transform: translateY(-5px); } .feature-icon { font-size: 40px; margin-bottom: 15px; } .feature-title { font-size: 20px; font-weight: 600; margin: 0 0 10px 0; color: #333; } .feature-desc { font-size: 14px; color: #666; line-height: 1.6; margin: 0; }`,
    editableProps: ['gap', 'padding', 'grid-template-columns'],
  },
  {
    id: 'feature-list',
    category: 'features',
    name: 'Feature List',
    icon: '✨',
    description: 'Vertical list of features with icons',
    html: `<div class="feature-list"><div class="feature-item"><div class="feature-icon">✓</div><div class="feature-content"><h4 class="feature-title">Easy to Use</h4><p class="feature-desc">Intuitive interface for everyone</p></div></div><div class="feature-item"><div class="feature-icon">✓</div><div class="feature-content"><h4 class="feature-title">Powerful Features</h4><p class="feature-desc">Everything you need to build great sites</p></div></div><div class="feature-item"><div class="feature-icon">✓</div><div class="feature-content"><h4 class="feature-title">24/7 Support</h4><p class="feature-desc">Always here when you need help</p></div></div></div>`,
    css: `.feature-list { display: flex; flex-direction: column; gap: 20px; } .feature-item { display: flex; gap: 15px; align-items: flex-start; } .feature-icon { width: 24px; height: 24px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; } .feature-content { flex: 1; } .feature-title { font-size: 16px; font-weight: 600; margin: 0 0 5px 0; color: #333; } .feature-desc { font-size: 14px; color: #666; margin: 0; line-height: 1.5; }`,
    editableProps: ['gap'],
  },

  // Testimonials
  {
    id: 'testimonial-card',
    category: 'testimonials',
    name: 'Testimonial Card',
    icon: '💬',
    description: 'Single testimonial with avatar',
    html: `<div class="testimonial-card"><div class="testimonial-content"><p class="testimonial-text">"This is the best tool I've ever used. It saved me hours of work and the results are amazing!"</p><div class="testimonial-author"><div class="testimonial-avatar"></div><div class="testimonial-info"><div class="testimonial-name">John Doe</div><div class="testimonial-role">CEO, Company</div></div></div></div></div>`,
    css: `.testimonial-card { padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); } .testimonial-content { text-align: center; } .testimonial-text { font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0; font-style: italic; } .testimonial-author { display: flex; align-items: center; justify-content: center; gap: 15px; } .testimonial-avatar { width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; } .testimonial-name { font-size: 16px; font-weight: 600; color: #333; } .testimonial-role { font-size: 14px; color: #666; }`,
    editableProps: ['padding', 'border-radius', 'box-shadow'],
  },
  {
    id: 'testimonial-grid',
    category: 'testimonials',
    name: 'Testimonial Grid',
    icon: '💬',
    description: 'Grid of 3 testimonials',
    html: `<div class="testimonial-grid"><div class="testimonial-card"><p class="testimonial-text">"Amazing product!"</p><div class="testimonial-name">Sarah K.</div></div><div class="testimonial-card"><p class="testimonial-text">"Highly recommend!"</p><div class="testimonial-name">Mike R.</div></div><div class="testimonial-card"><p class="testimonial-text">"Game changer!"</p><div class="testimonial-name">Emma L.</div></div></div>`,
    css: `.testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; } .testimonial-card { padding: 25px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .testimonial-text { font-size: 15px; color: #333; line-height: 1.5; margin: 0 0 15px 0; } .testimonial-name { font-size: 14px; font-weight: 600; color: #667eea; }`,
    editableProps: ['gap', 'grid-template-columns'],
  },

  // Pricing
  {
    id: 'pricing-cards-3',
    category: 'pricing',
    name: '3 Pricing Cards',
    icon: '💰',
    description: 'Three tier pricing cards',
    html: `<div class="pricing-grid"><div class="pricing-card"><div class="pricing-header"><h3 class="pricing-title">Basic</h3><div class="pricing-price">$9<span class="pricing-period">/mo</span></div></div><ul class="pricing-features"><li>✓ 5 Projects</li><li>✓ Basic Support</li><li>✓ 1GB Storage</li></ul><button class="pricing-cta">Choose Plan</button></div><div class="pricing-card pricing-featured"><div class="pricing-badge">Popular</div><div class="pricing-header"><h3 class="pricing-title">Pro</h3><div class="pricing-price">$29<span class="pricing-period">/mo</span></div></div><ul class="pricing-features"><li>✓ Unlimited Projects</li><li>✓ Priority Support</li><li>✓ 10GB Storage</li><li>✓ Advanced Analytics</li></ul><button class="pricing-cta">Choose Plan</button></div><div class="pricing-card"><div class="pricing-header"><h3 class="pricing-title">Enterprise</h3><div class="pricing-price">$99<span class="pricing-period">/mo</span></div></div><ul class="pricing-features"><li>✓ Everything in Pro</li><li>✓ Dedicated Support</li><li>✓ Unlimited Storage</li><li>✓ Custom Integrations</li></ul><button class="pricing-cta">Contact Sales</button></div></div>`,
    css: `.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 1200px; margin: 0 auto; } .pricing-card { padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); position: relative; } .pricing-featured { border: 2px solid #667eea; transform: scale(1.05); } .pricing-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; } .pricing-header { text-align: center; margin-bottom: 20px; } .pricing-title { font-size: 20px; font-weight: 600; color: #333; margin: 0 0 10px 0; } .pricing-price { font-size: 36px; font-weight: 700; color: #667eea; } .pricing-period { font-size: 14px; color: #666; font-weight: 400; } .pricing-features { list-style: none; padding: 0; margin: 0 0 20px 0; } .pricing-features li { padding: 8px 0; color: #666; font-size: 14px; } .pricing-cta { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; } .pricing-cta:hover { background: #5568d3; }`,
    editableProps: ['gap', 'grid-template-columns'],
  },

  // Footers
  {
    id: 'footer-simple',
    category: 'footers',
    name: 'Simple Footer',
    icon: '📄',
    description: 'Clean minimal footer',
    html: `<footer class="footer-simple"><div class="footer-content"><p class="footer-text">© 2024 Your Company. All rights reserved.</p></div></footer>`,
    css: `.footer-simple { padding: 40px 20px; background: #1a1a1e; color: #fff; text-align: center; } .footer-text { margin: 0; color: #858585; }`,
    editableProps: ['padding', 'background', 'color'],
  },
  {
    id: 'footer-columns',
    category: 'footers',
    name: 'Multi-Column Footer',
    icon: '📄',
    description: 'Footer with multiple columns',
    html: `<footer class="footer-columns"><div class="footer-grid"><div class="footer-col"><h4 class="footer-title">Company</h4><ul class="footer-links"><li><a href="#">About</a></li><li><a href="#">Careers</a></li><li><a href="#">Contact</a></li></ul></div><div class="footer-col"><h4 class="footer-title">Product</h4><ul class="footer-links"><li><a href="#">Features</a></li><li><a href="#">Pricing</a></li><li><a href="#">API</a></li></ul></div><div class="footer-col"><h4 class="footer-title">Legal</h4><ul class="footer-links"><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li><li><a href="#">Security</a></li></ul></div></div><div class="footer-bottom"><p class="footer-text">© 2024 Your Company. All rights reserved.</p></div></footer>`,
    css: `.footer-columns { padding: 60px 40px 30px; background: #1a1a1e; color: #fff; } .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; max-width: 1200px; margin: 0 auto 40px; } .footer-title { font-size: 16px; font-weight: 600; margin: 0 0 15px 0; color: #fff; } .footer-links { list-style: none; padding: 0; margin: 0; } .footer-links li { margin-bottom: 8px; } .footer-links a { color: #858585; text-decoration: none; transition: color 0.2s; } .footer-links a:hover { color: #e5a45a; } .footer-bottom { border-top: 1px solid #3c3c40; padding-top: 20px; text-align: center; } .footer-text { margin: 0; color: #666; font-size: 14px; }`,
    editableProps: ['padding', 'grid-template-columns', 'gap'],
  },
];

export const getComponentsByCategory = (categoryId: string): ComponentDefinition[] => {
  return COMPONENTS.filter(c => c.category === categoryId);
};

export const getComponentById = (id: string): ComponentDefinition | undefined => {
  return COMPONENTS.find(c => c.id === id);
};
