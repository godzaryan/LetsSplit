'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import CreateGroupModal from './CreateGroupModal';
import JoinGroupModal from './JoinGroupModal';

interface Group {
  id: string;
  name: string;
  icon_url: string | null;
  currency: string;
  role: string;
  memberId: string;
}

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export default function DashboardShell({
  user,
  groups,
  children,
}: {
  user: User;
  groups: Group[];
  children: React.ReactNode;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const getGroupInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const isGroupActive = (groupId: string) => {
    return pathname.includes(`/dashboard/group/${groupId}`);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* Mobile overlay */}
      <div 
        className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`} 
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Discord-style Server Sidebar */}
      <div className={`sidebar-desktop ${isMobileOpen ? 'open' : ''}`} style={{
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '8px',
        borderRight: '1px solid var(--border-subtle)',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Home button */}
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: pathname === '/dashboard' ? '16px' : '24px',
            background: pathname === '/dashboard' ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
          title="Home"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </Link>

        {/* Divider */}
        <div style={{
          width: '32px',
          height: '2px',
          background: 'var(--border-subtle)',
          borderRadius: '1px',
          margin: '4px 0',
        }} />

        {/* Group icons */}
        {groups.map((group) => (
          <Link key={group.id} href={`/dashboard/group/${group.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: isGroupActive(group.id) ? '16px' : '24px',
                background: isGroupActive(group.id)
                  ? 'var(--accent-primary)'
                  : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '18px',
                fontWeight: 700,
                color: isGroupActive(group.id) ? 'white' : 'var(--text-secondary)',
                position: 'relative',
              }}
              title={group.name}
            >
              {group.icon_url ? (
                <img src={group.icon_url} alt={group.name} style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 'inherit',
                  objectFit: 'cover',
                }} />
              ) : (
                getGroupInitial(group.name)
              )}
              {/* Active indicator */}
              {isGroupActive(group.id) && (
                <div style={{
                  position: 'absolute',
                  left: '-6px',
                  width: '4px',
                  height: '36px',
                  borderRadius: '0 4px 4px 0',
                  background: 'white',
                }} />
              )}
            </div>
          </Link>
        ))}

        {/* Add Group button */}
        <div
          onClick={() => setShowCreateModal(true)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'var(--accent-success)',
            fontSize: '24px',
            fontWeight: 300,
          }}
          title="Create Group"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-success)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderRadius = '16px';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--accent-success)';
            e.currentTarget.style.borderRadius = '24px';
          }}
        >
          +
        </div>

        {/* Join Group button */}
        <div
          onClick={() => setShowJoinModal(true)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'var(--accent-secondary)',
            fontSize: '18px',
          }}
          title="Join Group"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-secondary)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderRadius = '16px';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--accent-secondary)';
            e.currentTarget.style.borderRadius = '24px';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User avatar */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '24px',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
            }}
            title={user?.display_name || 'Profile'}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-secondary)' }}>
                {(user?.display_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="glass animate-fade-in" style={{
              position: 'absolute',
              bottom: '56px',
              left: '0',
              width: '220px',
              borderRadius: '12px',
              padding: '8px',
              zIndex: 100,
            }}>
              <div style={{
                padding: '12px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '4px',
              }}>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{user?.display_name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--accent-danger)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        width: '100%',
      }}>
        {/* Mobile Header (only visible on small screens) */}
        <div className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger" onClick={() => setIsMobileOpen(true)}>
              ☰
            </button>
            <span style={{ fontWeight: 700, fontSize: '18px' }} className="gradient-text">
              LetsSplit
            </span>
          </div>
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)' }}>
                {(user?.display_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
        }}>
          {children}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
      {showJoinModal && <JoinGroupModal onClose={() => setShowJoinModal(false)} />}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          onClick={() => setShowUserMenu(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
          }}
        />
      )}
    </div>
  );
}
