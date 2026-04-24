import React, { useState } from 'react';

interface LayoutBuilderProps {
  onApplyLayout: (layout: LayoutConfig) => void;
  onClose: () => void;
}

export interface LayoutConfig {
  type: 'grid' | 'flex';
  grid?: {
    columns: string;
    rows: string;
    gap: string;
  };
  flex?: {
    direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    wrap: 'nowrap' | 'wrap' | 'wrap-reverse';
    justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    gap: string;
  };
}

const LayoutBuilder: React.FC<LayoutBuilderProps> = ({ onApplyLayout, onClose }) => {
  const [layoutType, setLayoutType] = useState<'grid' | 'flex'>('grid');
  const [gridConfig, setGridConfig] = useState({
    columns: 'repeat(3, 1fr)',
    rows: 'auto',
    gap: '20px',
  });
  const [flexConfig, setFlexConfig] = useState({
    direction: 'row' as const,
    wrap: 'nowrap' as const,
    justifyContent: 'flex-start' as const,
    alignItems: 'stretch' as const,
    gap: '20px',
  });

  const handleApply = () => {
    const config: LayoutConfig = {
      type: layoutType,
      grid: layoutType === 'grid' ? gridConfig : undefined,
      flex: layoutType === 'flex' ? flexConfig : undefined,
    };
    onApplyLayout(config);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      right: '268px',
      top: '32px',
      bottom: '0',
      width: '280px',
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
        }}>Layout Builder</h3>
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
        {/* Layout Type Toggle */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#858585',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Layout Type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setLayoutType('grid')}
              style={{
                flex: 1,
                padding: '8px',
                background: layoutType === 'grid' ? 'rgba(229,164,90,0.15)' : '#2d2d31',
                border: layoutType === 'grid' ? '1px solid rgba(229,164,90,0.4)' : '1px solid #3c3c40',
                borderRadius: 4,
                color: layoutType === 'grid' ? '#e5a45a' : '#858585',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setLayoutType('flex')}
              style={{
                flex: 1,
                padding: '8px',
                background: layoutType === 'flex' ? 'rgba(229,164,90,0.15)' : '#2d2d31',
                border: layoutType === 'flex' ? '1px solid rgba(229,164,90,0.4)' : '1px solid #3c3c40',
                borderRadius: 4,
                color: layoutType === 'flex' ? '#e5a45a' : '#858585',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Flexbox
            </button>
          </div>
        </div>

        {/* Grid Controls */}
        {layoutType === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Columns
              </label>
              <select
                value={gridConfig.columns}
                onChange={(e) => setGridConfig({ ...gridConfig, columns: e.target.value })}
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
              >
                <option value="repeat(2, 1fr)">2 Columns</option>
                <option value="repeat(3, 1fr)">3 Columns</option>
                <option value="repeat(4, 1fr)">4 Columns</option>
                <option value="1fr 2fr 1fr">Custom (1fr 2fr 1fr)</option>
                <option value="auto-fit minmax(200px 1fr)">Auto-fit</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Rows
              </label>
              <select
                value={gridConfig.rows}
                onChange={(e) => setGridConfig({ ...gridConfig, rows: e.target.value })}
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
              >
                <option value="auto">Auto</option>
                <option value="repeat(2, auto)">2 Rows</option>
                <option value="repeat(3, auto)">3 Rows</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Gap
              </label>
              <input
                type="text"
                value={gridConfig.gap}
                onChange={(e) => setGridConfig({ ...gridConfig, gap: e.target.value })}
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
          </div>
        )}

        {/* Flexbox Controls */}
        {layoutType === 'flex' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Direction
              </label>
              <select
                value={flexConfig.direction}
                onChange={(e) => setFlexConfig({ ...flexConfig, direction: e.target.value as any })}
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
              >
                <option value="row">Row</option>
                <option value="column">Column</option>
                <option value="row-reverse">Row Reverse</option>
                <option value="column-reverse">Column Reverse</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Wrap
              </label>
              <select
                value={flexConfig.wrap}
                onChange={(e) => setFlexConfig({ ...flexConfig, wrap: e.target.value as any })}
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
              >
                <option value="nowrap">No Wrap</option>
                <option value="wrap">Wrap</option>
                <option value="wrap-reverse">Wrap Reverse</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Justify Content
              </label>
              <select
                value={flexConfig.justifyContent}
                onChange={(e) => setFlexConfig({ ...flexConfig, justifyContent: e.target.value as any })}
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
              >
                <option value="flex-start">Flex Start</option>
                <option value="flex-end">Flex End</option>
                <option value="center">Center</option>
                <option value="space-between">Space Between</option>
                <option value="space-around">Space Around</option>
                <option value="space-evenly">Space Evenly</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Align Items
              </label>
              <select
                value={flexConfig.alignItems}
                onChange={(e) => setFlexConfig({ ...flexConfig, alignItems: e.target.value as any })}
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
              >
                <option value="flex-start">Flex Start</option>
                <option value="flex-end">Flex End</option>
                <option value="center">Center</option>
                <option value="stretch">Stretch</option>
                <option value="baseline">Baseline</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '10px',
                color: '#858585',
                marginBottom: '4px',
              }}>
                Gap
              </label>
              <input
                type="text"
                value={flexConfig.gap}
                onChange={(e) => setFlexConfig({ ...flexConfig, gap: e.target.value })}
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
          </div>
        )}

        {/* Preview */}
        <div style={{ marginTop: '16px', padding: '12px', background: '#1a1a1e', borderRadius: 4, border: '1px solid #3c3c40' }}>
          <div style={{
            fontSize: '10px',
            color: '#858585',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            CSS Preview
          </div>
          <pre style={{
            margin: 0,
            fontSize: '9px',
            color: '#858585',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {layoutType === 'grid' ? (
              `display: grid;\ngrid-template-columns: ${gridConfig.columns};\ngrid-template-rows: ${gridConfig.rows};\ngap: ${gridConfig.gap};`
            ) : (
              `display: flex;\nflex-direction: ${flexConfig.direction};\nflex-wrap: ${flexConfig.wrap};\njustify-content: ${flexConfig.justifyContent};\nalign-items: ${flexConfig.alignItems};\ngap: ${flexConfig.gap};`
            )}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #3c3c40',
        background: '#1a1a1e',
      }}>
        <button
          onClick={handleApply}
          style={{
            width: '100%',
            padding: '8px',
            background: '#e5a45a',
            border: 'none',
            borderRadius: 4,
            color: '#1a1a1e',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Apply Layout
        </button>
      </div>
    </div>
  );
};

export default LayoutBuilder;
