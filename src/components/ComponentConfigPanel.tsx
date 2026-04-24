import React, { useState, useEffect } from 'react';
import { ComponentDefinition } from './ComponentLibrary';

interface ComponentConfigPanelProps {
  component: ComponentDefinition | null;
  onPropChange: (prop: string, value: string) => void;
  onClose: () => void;
}

const ComponentConfigPanel: React.FC<ComponentConfigPanelProps> = ({ component, onPropChange, onClose }) => {
  const [props, setProps] = useState<Record<string, string>>({});

  useEffect(() => {
    if (component) {
      // Initialize with default values from CSS
      const defaultProps: Record<string, string> = {};
      if (component.css) {
        // Parse CSS to extract default values
        const styleRegex = /([a-z-]+):\s*([^;]+);/g;
        let match;
        while ((match = styleRegex.exec(component.css)) !== null) {
          defaultProps[match[1]] = match[2].trim();
        }
      }
      setProps(defaultProps);
    }
  }, [component]);

  if (!component) return null;

  const handlePropChange = (prop: string, value: string) => {
    setProps(prev => ({ ...prev, [prop]: value }));
    onPropChange(prop, value);
  };

  return (
    <div style={{
      position: 'fixed',
      right: '268px',
      top: '32px',
      bottom: '0',
      width: '250px',
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
        }}>Configure {component.name}</h3>
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
        {/* Component Info */}
        <div style={{
          marginBottom: '16px',
          padding: '10px',
          background: '#2d2d31',
          borderRadius: 4,
          border: '1px solid #3c3c40',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>{component.icon}</span>
            <span style={{
              fontSize: '12px',
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

        {/* Editable Properties */}
        {component.editableProps && component.editableProps.length > 0 ? (
          <div>
            <h4 style={{
              margin: '0 0 10px 0',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#858585',
            }}>Properties</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {component.editableProps.map(prop => (
                <div key={prop}>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#858585',
                    marginBottom: '4px',
                  }}>
                    {prop}
                  </label>
                  <input
                    type="text"
                    value={props[prop] || ''}
                    onChange={(e) => handlePropChange(prop, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: '#2d2d31',
                      border: '1px solid #3c3c40',
                      borderRadius: 3,
                      color: '#e0e0e0',
                      fontSize: '11px',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '11px',
          }}>
            No editable properties
          </div>
        )}

        {/* CSS Preview */}
        {component.css && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{
              margin: '0 0 10px 0',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#858585',
            }}>CSS</h4>
            <pre style={{
              margin: 0,
              padding: '10px',
              background: '#1a1a1e',
              border: '1px solid #3c3c40',
              borderRadius: 4,
              fontSize: '9px',
              color: '#858585',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {component.css}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentConfigPanel;
