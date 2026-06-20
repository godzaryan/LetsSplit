'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import CreateGroupModal from './CreateGroupModal';
import JoinGroupModal from './JoinGroupModal';
import UpiPromptModal from './UpiPromptModal';

interface Group {
  id: string;
  name: string;
  icon_url: string | null;
  currency: string;
  role: string;
  status: string;
  memberId: string;
}

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  upi_id?: string | null;
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
  const [showUpiPrompt, setShowUpiPrompt] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (user && !user.upi_id) {
      setShowUpiPrompt(true);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      // 1. Clear client-side auth state (removes localStorage tokens)
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error clearing client session:', error);
    }

    try {
      // 2. Call the server-side API route to reliably clear all HTTP cookies
      const response = await fetch('/auth/signout', { method: 'POST' });
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      window.location.href = '/';
    }
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
      flex: 1,
      width: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* Mobile overlay */}
      <div 
        className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`} 
        onClick={() => setIsMobileOpen(false)}
      />

      {/* New Desktop Sidebar (260px) */}
      <div className={`sidebar-desktop ${isMobileOpen ? 'open' : ''}`} style={{
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-subtle)',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Brand Header */}
        <div style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
          }}>
            <img src="/money-bag.png" alt="LetsSplit Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: 'white' }}>
            LetsSplit
          </span>
        </div>

        {/* Navigation Area */}
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <Link href="/dashboard" className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`} style={{ position: 'relative' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Dashboard
          </Link>

          <div style={{ margin: '24px 0 8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.5px' }}>
            YOUR GROUPS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {groups.map((group) => (
              <Link 
                key={group.id} 
                href={group.status === 'pending' ? '#' : `/dashboard/group/${group.id}`} 
                className={`sidebar-link ${isGroupActive(group.id) ? 'active' : ''}`} 
                style={{ 
                  position: 'relative',
                  opacity: group.status === 'pending' ? 0.5 : 1,
                  cursor: group.status === 'pending' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onClick={(e) => {
                  if (group.status === 'pending') {
                    e.preventDefault();
                  }
                }}
                title={group.status === 'pending' ? 'Pending Approval' : group.name}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: isGroupActive(group.id) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'white',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {group.icon_url ? (
                      <img src={group.icon_url} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getGroupInitial(group.name)
                    )}
                  </div>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {group.name}
                  </span>
                </div>
                {group.status === 'pending' && (
                  <span style={{ 
                    fontSize: '9px', 
                    fontWeight: 700, 
                    padding: '2px 6px', 
                    background: 'rgba(255, 170, 0, 0.2)', 
                    color: 'var(--accent-warning)', 
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Pending
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div style={{ margin: '24px 0 8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.5px' }}>
            ACTIONS
          </div>

          <button onClick={() => setShowCreateModal(true)} className="sidebar-link" style={{ color: 'var(--accent-primary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create New Group
          </button>
          
          <button onClick={() => setShowJoinModal(true)} className="sidebar-link" style={{ color: 'var(--text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Join Group
          </button>
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
        position: 'relative',
      }}>
        {/* Top Header */}
        <header className="top-header">
          {/* Mobile Hamburger */}
          <button 
            className="hamburger" 
            onClick={() => setIsMobileOpen(true)}
            style={{ marginRight: '16px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Dynamic Breadcrumb (Desktop mainly) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>LetsSplit</span>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <polyline points="9 18 15 12 9 6"></polyline>
             </svg>
             <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
               {pathname === '/dashboard' ? 'Overview' : groups.find(g => isGroupActive(g.id))?.name || 'Group'}
             </span>
          </div>
          
          {/* User Profile */}
          <div style={{ position: 'relative' }}>
            {/* Click outside to close user menu */}
            {showUserMenu && (
              <div
                onClick={() => setShowUserMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              />
            )}
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '24px',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--gradient-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {(user?.display_name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'none' /* hidden on very small screens, could use a class */ }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="animate-fade-in" style={{
                position: 'absolute',
                top: '56px',
                right: '0',
                width: '240px',
                borderRadius: '16px',
                padding: '8px',
                zIndex: 100,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-active)',
                boxShadow: 'var(--shadow-lg), 0 10px 40px rgba(0,0,0,0.8)',
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '8px',
                  background: 'rgba(230, 0, 0, 0.05)',
                  borderRadius: '10px',
                }}>
                  <p style={{ fontWeight: 800, fontSize: '16px', color: '#ffffff', letterSpacing: '0.5px' }}>{user?.display_name}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-all' }}>{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(230, 0, 0, 0.08)',
                    border: '1px solid rgba(230, 0, 0, 0.2)',
                    borderRadius: '10px',
                    color: 'var(--accent-primary-light)',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(230,0,0,0.15)';
                    e.currentTarget.style.paddingLeft = '20px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(230, 0, 0, 0.08)';
                    e.currentTarget.style.paddingLeft = '16px';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
        }}>
          {children}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
      {showJoinModal && <JoinGroupModal onClose={() => setShowJoinModal(false)} />}
      {showUpiPrompt && user?.id && <UpiPromptModal userId={user.id} onComplete={() => setShowUpiPrompt(false)} />}
    </div>
  );
}
