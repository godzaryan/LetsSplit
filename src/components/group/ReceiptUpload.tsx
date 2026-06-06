'use client';

import { useState, useRef } from 'react';
import { uploadReceipt } from '@/lib/receipts';

interface ReceiptUploadProps {
  groupId: string;
  expenseId: string;
  currentReceiptUrl: string | null;
  onUploaded: (url: string) => void;
}

export default function ReceiptUpload({
  groupId,
  expenseId,
  currentReceiptUrl,
  onUploaded,
}: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentReceiptUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File too large. Max 5MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Use JPG, PNG, WebP, GIF, or PDF.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Show preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      const url = await uploadReceipt(file, groupId, expenseId);
      onUploaded(url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPreviewUrl(currentReceiptUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      {previewUrl ? (
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}>
          <img
            src={previewUrl}
            alt="Receipt"
            style={{
              width: '100%',
              maxHeight: '200px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            gap: '6px',
          }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                color: 'white',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            padding: '24px',
            borderRadius: '12px',
            border: '2px dashed var(--border-subtle)',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: uploading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!uploading) e.currentTarget.style.borderColor = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>
            {uploading ? '⏳' : '📎'}
          </div>
          <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            {uploading ? 'Uploading...' : 'Attach Receipt'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            JPG, PNG, WebP, or PDF (max 5MB)
          </p>
        </div>
      )}

      {error && (
        <p style={{
          fontSize: '12px',
          color: 'var(--accent-danger)',
          marginTop: '6px',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
