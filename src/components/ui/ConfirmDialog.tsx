import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  isAlert?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isAlert = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAlert) {
          onCancel();
        }
      }}
    >
      <div 
        className="glass animate-fade-in" 
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 700, 
          marginBottom: '8px',
          color: type === 'danger' ? 'var(--accent-danger)' : 'var(--text-primary)'
        }}>
          {title}
        </h2>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '14px', 
          marginBottom: '24px',
          lineHeight: 1.5,
        }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {!isAlert && (
            <button
              onClick={onCancel}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{ 
              padding: '8px 16px', 
              fontSize: '14px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              background: type === 'danger' ? 'rgba(255, 107, 107, 0.15)' : 'var(--accent-primary)',
              color: type === 'danger' ? 'var(--accent-danger)' : 'white',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (type === 'danger') {
                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.25)';
              } else {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (type === 'danger') {
                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
              } else {
                e.currentTarget.style.filter = 'none';
              }
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
