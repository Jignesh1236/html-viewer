import React, { useState } from 'react';

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  html: string;
  css?: string;
}

interface TemplateLibraryProps {
  onUseTemplate: (template: Template) => void;
  onClose: () => void;
}

const TEMPLATES: Template[] = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    category: 'Marketing',
    description: 'Modern landing page with hero section, features, and CTA',
    thumbnail: '🚀',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>Landing Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; }
    .hero { padding: 80px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .hero h1 { font-size: 48px; margin-bottom: 20px; }
    .hero p { font-size: 18px; margin-bottom: 30px; opacity: 0.9; }
    .btn { padding: 12px 30px; background: white; color: #667eea; text-decoration: none; border-radius: 30px; font-weight: 600; }
    .features { padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
    .features h2 { text-align: center; margin-bottom: 40px; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
    .feature { padding: 30px; background: #f8f9fa; border-radius: 8px; }
    .feature h3 { margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>Welcome to Our Product</h1>
    <p>Build amazing things with our powerful platform</p>
    <a href="#" class="btn">Get Started</a>
  </div>
  <div class="features">
    <h2>Features</h2>
    <div class="feature-grid">
      <div class="feature">
        <h3>Feature 1</h3>
        <p>Description of feature 1</p>
      </div>
      <div class="feature">
        <h3>Feature 2</h3>
        <p>Description of feature 2</p>
      </div>
      <div class="feature">
        <h3>Feature 3</h3>
        <p>Description of feature 3</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    category: 'Portfolio',
    description: 'Clean portfolio template with project gallery',
    thumbnail: '🎨',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>Portfolio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; }
    .header { padding: 40px 20px; text-align: center; }
    .header h1 { font-size: 36px; margin-bottom: 10px; }
    .gallery { padding: 40px 20px; max-width: 1200px; margin: 0 auto; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .project { aspect-ratio: 16/9; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .project h3 { color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>My Portfolio</h1>
    <p>Creative Designer & Developer</p>
  </div>
  <div class="gallery">
    <div class="gallery-grid">
      <div class="project"><h3>Project 1</h3></div>
      <div class="project"><h3>Project 2</h3></div>
      <div class="project"><h3>Project 3</h3></div>
      <div class="project"><h3>Project 4</h3></div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'blog',
    name: 'Blog',
    category: 'Content',
    description: 'Simple blog layout with posts list',
    thumbnail: '📝',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>Blog</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 36px; margin-bottom: 10px; }
    .post { padding: 30px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px; }
    .post h2 { margin-bottom: 10px; }
    .post-meta { color: #666; font-size: 14px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Blog</h1>
      <p>Thoughts and ideas</p>
    </div>
    <div class="post">
      <h2>First Post</h2>
      <div class="post-meta">January 1, 2024</div>
      <p>This is the content of the first blog post...</p>
    </div>
    <div class="post">
      <h2>Second Post</h2>
      <div class="post-meta">January 15, 2024</div>
      <p>This is the content of the second blog post...</p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'contact',
    name: 'Contact Page',
    category: 'Business',
    description: 'Contact form with information section',
    thumbnail: '📧',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>Contact</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; }
    .form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .form-group textarea { height: 120px; }
    .btn { padding: 12px 30px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Contact Us</h1>
      <p>We'd love to hear from you</p>
    </div>
    <form>
      <div class="form-group">
        <label>Name</label>
        <input type="text" placeholder="Your name">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" placeholder="your@email.com">
      </div>
      <div class="form-group">
        <label>Message</label>
        <textarea placeholder="Your message"></textarea>
      </div>
      <button type="submit" class="btn">Send Message</button>
    </form>
  </div>
</body>
</html>`,
  },
];

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onUseTemplate, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{
      position: 'fixed',
      right: '268px',
      top: '32px',
      bottom: '0',
      width: '320px',
      background: '#1f1f23',
      borderLeft: '1px solid #3c3c40',
      borderRight: '1px solid #3c3c40',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #3c3c40',
        background: '#1a1a1e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#e0e0e0',
        }}>Templates</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#858585',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Search */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              background: '#2d2d31',
              border: '1px solid #3c3c40',
              borderRadius: 4,
              color: '#e0e0e0',
              fontSize: '11px',
              outline: 'none',
            }}
          />
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '4px 10px',
                background: selectedCategory === cat ? 'rgba(229,164,90,0.15)' : 'transparent',
                border: selectedCategory === cat ? '1px solid rgba(229,164,90,0.4)' : '1px solid #3c3c40',
                borderRadius: 12,
                color: selectedCategory === cat ? '#e5a45a' : '#858585',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTemplates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              color: '#666',
              fontSize: '11px',
            }}>
              No templates found
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div
                key={template.id}
                style={{
                  padding: '12px',
                  background: '#2d2d31',
                  border: '1px solid #3c3c40',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => onUseTemplate(template)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#e5a45a';
                  e.currentTarget.style.background = '#36363b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3c3c40';
                  e.currentTarget.style.background = '#2d2d31';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{template.thumbnail}</span>
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#e0e0e0',
                    }}>{template.name}</div>
                    <div style={{
                      fontSize: '10px',
                      color: '#858585',
                    }}>{template.category}</div>
                  </div>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '10px',
                  color: '#858585',
                  lineHeight: 1.4,
                }}>{template.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
