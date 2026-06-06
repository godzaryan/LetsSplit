import { createClient } from '@/lib/supabase/client';

/**
 * Upload a receipt image to Supabase Storage
 * Returns the public URL of the uploaded file
 */
export async function uploadReceipt(
  file: File,
  groupId: string,
  expenseId: string
): Promise<string> {
  const supabase = createClient();

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${groupId}/${expenseId}_${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get signed URL (valid for 1 hour)
  const { data: urlData } = await supabase.storage
    .from('receipts')
    .createSignedUrl(data.path, 3600);

  return urlData?.signedUrl || data.path;
}

/**
 * Get a signed URL for a receipt
 */
export async function getReceiptUrl(path: string): Promise<string> {
  const supabase = createClient();

  const { data } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600);

  return data?.signedUrl || '';
}

/**
 * Delete a receipt from storage
 */
export async function deleteReceipt(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from('receipts')
    .remove([path]);

  if (error) throw error;
}
