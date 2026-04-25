import React, { useState } from 'react';
import { COMPONENT_CATEGORIES, getComponentsByCategory, ComponentDefinition } from './ComponentLibrary';

interface ComponentSidebarProps {
  onDragStart: (component: ComponentDefinition) => void;
}

const ComponentSidebar: React.FC<ComponentSidebarProps> = ({ onDragStart }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(COMPONENT_CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComponents = getComponentsByCategory(selectedCategory).filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(component);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1f1f23',
      borderRight: '1px solid #3c3c40',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #3c3c40',
        background: 'linear-gradient(180deg, #1a1a1e 0%, #1f1f23 100%)',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#e5a45a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>🧩</span>
          Components
        </h3>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '10px',
          color: '#858585',
          fontWeight: 400,
        }}>Drag to canvas</p>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: '#2d2d31',
              border: '1px solid #3c3c40',
              borderRadius: 6,
              color: '#e0e0e0',
              fontSize: '11px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#e5a45a';
              e.target.style.boxShadow = '0 0 0 2px rgba(229,164,90,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#3c3c40';
              e.target.style.boxShadow = 'none';
            }}
          />
          <span style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#666',
            pointerEvents: 'none',
          }}>🔍</span>
        </div>
      </div>

      {/* Categories */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '0 14px 10px',
        borderBottom: '1px solid #3c3c40',
      }}>
        {COMPONENT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '6px 10px',
              background: selectedCategory === cat.id ? 'rgba(229,164,90,0.15)' : 'transparent',
              border: selectedCategory === cat.id ? '1px solid rgba(229,164,90,0.4)' : '1px solid #3c3c40',
              borderRadius: 6,
              color: selectedCategory === cat.id ? '#e5a45a' : '#858585',
              fontSize: '10px',
              fontWeight: selectedCategory === cat.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== cat.id) {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== cat.id) {
                e.currentTarget.style.borderColor = '#3c3c40';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Component List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 14px',
      }}>
        {filteredComponents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666',
            fontSize: '11px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            No components found
            <div style={{ fontSize: '10px', marginTop: '8px', color: '#555' }}>Try a different search term</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredComponents.map(component => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                style={{
                  padding: '12px',
                  background: '#2d2d31',
                  border: '1px solid #3c3c40',
                  borderRadius: 8,
                  cursor: 'grab',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#e5a45a';
                  e.currentTarget.style.background = '#36363b';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3c3c40';
                  e.currentTarget.style.background = '#2d2d31';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{component.icon}</span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#e0e0e0',
                  }}>{component.name}</span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '10px',
                  color: '#858585',
                  lineHeight: 1.5,
                }}>{component.description}</p>
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#555',
                  opacity: 0.5,
                }}>⋮⋮</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentSidebar;
