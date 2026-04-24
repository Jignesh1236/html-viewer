import React, { useState } from 'react';

interface Page {
  id: string;
  name: string;
  html: string;
  css?: string;
  isDefault: boolean;
}

interface PageManagerProps {
  pages: Page[];
  onAddPage: (page: Page) => void;
  onDeletePage: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onSelectPage: (id: string) => void;
  selectedPageId: string | null;
  onClose: () => void;
}

const PageManager: React.FC<PageManagerProps> = ({
  pages,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onSelectPage,
  selectedPageId,
  onClose,
}) => {
  const [newPageName, setNewPageName] = useState('');

  const handleAddPage = () => {
    if (!newPageName.trim()) return;
    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: newPageName,
      html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>New Page</h1>\n</body>\n</html>',
      isDefault: false,
    };
    onAddPage(newPage);
    setNewPageName('');
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
        }}>Page Manager</h3>
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
        {/* Add New Page */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#858585',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Add New Page
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Page name..."
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPage()}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: '#2d2d31',
                border: '1px solid #3c3c40',
                borderRadius: 3,
                color: '#e0e0e0',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleAddPage}
              style={{
                padding: '6px 12px',
                background: '#e5a45a',
                border: 'none',
                borderRadius: 3,
                color: '#1a1a1e',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Pages List */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#858585',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Pages ({pages.length})
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#666',
                fontSize: '11px',
              }}>
                No pages yet
              </div>
            ) : (
              pages.map((page) => (
                <div
                  key={page.id}
                  style={{
                    padding: '10px',
                    background: selectedPageId === page.id ? 'rgba(229,164,90,0.15)' : '#2d2d31',
                    border: selectedPageId === page.id ? '1px solid rgba(229,164,90,0.4)' : '1px solid #3c3c40',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => onSelectPage(page.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: selectedPageId === page.id ? '#e5a45a' : '#e0e0e0',
                    }}>
                      {page.name}
                    </span>
                    {page.isDefault && (
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        background: 'rgba(229,164,90,0.2)',
                        color: '#e5a45a',
                        borderRadius: 3,
                      }}>
                        Default
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(page.id);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        border: '1px solid #3c3c40',
                        borderRadius: 3,
                        color: '#858585',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#e5a45a';
                        e.currentTarget.style.color = '#e5a45a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#3c3c40';
                        e.currentTarget.style.color = '#858585';
                      }}
                    >
                      Duplicate
                    </button>
                    {!page.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(page.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: '1px solid #3c3c40',
                          borderRadius: 3,
                          color: '#858585',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#f87171';
                          e.currentTarget.style.color = '#f87171';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#3c3c40';
                          e.currentTarget.style.color = '#858585';
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageManager;
