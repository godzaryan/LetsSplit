'use client';

import { useState } from 'react';
import { generateQRCodeURL, generateUPILink, generatePaymentText } from '@/lib/payments';

interface PaymentQRProps {
  fromName: string;
  toName: string;
  toUpiId?: string;
  amount: number;
  currencySymbol: string;
  groupName: string;
}

export default function PaymentQR({
  fromName,
  toName,
  toUpiId,
  amount,
  currencySymbol,
  groupName,
}: PaymentQRProps) {
  const [upiId, setUpiId] = useState(toUpiId || '');
  const [showQR, setShowQR] = useState(!!toUpiId);
  const [copied, setCopied] = useState(false);

  const paymentNote = `LetsSplit: ${fromName} → ${toName} (${groupName})`;
  const upiLink = upiId ? generateUPILink(toName, upiId, amount, paymentNote) : '';
  const qrUrl = upiLink ? generateQRCodeURL(upiLink, 250) : '';

  const shareText = generatePaymentText(fromName, toName, amount, currencySymbol, groupName);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LetsSplit Settlement',
          text: shareText,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div style={{
      padding: '20px',
      borderRadius: '16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {fromName} pays {toName}
        </p>
        <p style={{
          fontSize: '28px',
          fontWeight: 800,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {currencySymbol}{amount.toFixed(2)}
        </p>
      </div>

      {/* UPI input for QR (only show if not auto-populated) */}
      {!toUpiId && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '6px',
            color: 'var(--text-secondary)',
          }}>
            Payee UPI ID (for QR code)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="user@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              style={{ flex: 1, fontSize: '13px' }}
            />
            <button
              className="btn-primary"
              onClick={() => setShowQR(true)}
              disabled={!upiId.trim()}
              style={{
                fontSize: '12px',
                padding: '8px 14px',
                opacity: !upiId.trim() ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Generate QR
            </button>
          </div>
        </div>
      )}

      {/* QR Code display */}
      {showQR && upiLink && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          marginBottom: '16px',
        }}>
          <img
            src={qrUrl}
            alt="UPI QR Code"
            width={200}
            height={200}
            style={{ display: 'block', margin: '0 auto' }}
          />
          <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
            Scan with any UPI app
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="btn-secondary"
          onClick={handleCopy}
          style={{ flex: 1, fontSize: '12px' }}
        >
          {copied ? '✓ Copied!' : '📋 Copy Details'}
        </button>
        <button
          className="btn-secondary"
          onClick={handleShare}
          style={{ flex: 1, fontSize: '12px' }}
        >
          📤 Share
        </button>
        {upiLink && (
          <a
            href={upiLink}
            className="btn-primary"
            style={{
              flex: 1,
              fontSize: '12px',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            💳 Pay via UPI
          </a>
        )}
      </div>
    </div>
  );
}
