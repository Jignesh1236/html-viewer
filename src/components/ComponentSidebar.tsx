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
        padding: '10px 12px',
        borderBottom: '1px solid #3c3c40',
        background: '#1a1a1e',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#e0e0e0',
        }}>Components</h3>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px' }}>
        <input
          type="text"
          placeholder="Search components..."
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
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '0 12px 8px',
        borderBottom: '1px solid #3c3c40',
      }}>
        {COMPONENT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '4px 8px',
              background: selectedCategory === cat.id ? 'rgba(229,164,90,0.15)' : 'transparent',
              border: selectedCategory === cat.id ? '1px solid rgba(229,164,90,0.4)' : '1px solid #3c3c40',
              borderRadius: 3,
              color: selectedCategory === cat.id ? '#e5a45a' : '#858585',
              fontSize: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
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
        padding: '8px 12px',
      }}>
        {filteredComponents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#666',
            fontSize: '11px',
          }}>
            No components found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredComponents.map(component => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                style={{
                  padding: '10px',
                  background: '#2d2d31',
                  border: '1px solid #3c3c40',
                  borderRadius: 4,
                  cursor: 'grab',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#e5a45a';
                  e.currentTarget.style.background = '#36363b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3c3c40';
                  e.currentTarget.style.background = '#2d2d31';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>{component.icon}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#e0e0e0',
                  }}>{component.name}</span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '10px',
                  color: '#858585',
                  lineHeight: 1.4,
                }}>{component.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentSidebar;
