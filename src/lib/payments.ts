/**
 * Generate a UPI payment deep link for settlements
 * Works with Google Pay, PhonePe, Paytm, and other UPI apps
 */
export function generateUPILink(
  payeeName: string,
  payeeUPI: string | null,
  amount: number,
  note: string
): string {
  if (!payeeUPI) return '';

  const params = new URLSearchParams({
    pa: payeeUPI, // payee VPA
    pn: payeeName,
    am: amount.toFixed(2),
    tn: note,
    cu: 'INR',
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate a QR code data URL using a free API
 * Returns a URL that can be used as an img src
 */
export function generateQRCodeURL(data: string, size: number = 200): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=svg`;
}

/**
 * Generate a generic payment link text for sharing
 */
export function generatePaymentText(
  fromName: string,
  toName: string,
  amount: number,
  currencySymbol: string,
  groupName: string
): string {
  return `💰 LetsSplit Settlement\n${fromName} → ${toName}\nAmount: ${currencySymbol}${amount.toFixed(2)}\nGroup: ${groupName}\n\nPowered by LetsSplit`;
}
