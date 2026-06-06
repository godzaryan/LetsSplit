'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState('Fixed Expense, Monthly Expense');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const labelArray = labels
        .split(',')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          labels: labelArray,
          currency,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'owner',
          added_by: user.id,
        });

      if (memberError) throw memberError;

      onClose();
      router.push(`/dashboard/group/${group.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '20px',
        padding: '32px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
          Create a new group
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Set up a group to start splitting expenses with friends.
        </p>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Group Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Goa Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              autoFocus
              id="create-group-name"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Description
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="What is this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              id="create-group-description"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Default Expense Labels
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Rent, Food, Utilities (comma separated)"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              maxLength={200}
              id="create-group-labels"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Comma-separated tags for organizing expenses.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Currency
            </label>
            <select
              className="input-field"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ cursor: 'pointer' }}
              id="create-group-currency"
            >
              <option value="INR">₹ INR — Indian Rupee</option>
              <option value="USD">$ USD — US Dollar</option>
              <option value="EUR">€ EUR — Euro</option>
              <option value="GBP">£ GBP — British Pound</option>
            </select>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              color: 'var(--accent-danger)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !name.trim()}
              style={{
                flex: 1,
                opacity: loading || !name.trim() ? 0.6 : 1,
              }}
              id="create-group-submit"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
