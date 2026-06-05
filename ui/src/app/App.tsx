// MARKER-MAKE-KIT-INVOKED
import { useEffect, useState } from 'react';
import {
  Compass, MapPin, Radar, ChevronRight, Bell, User,
  Menu, X, LogOut, HelpCircle,
} from 'lucide-react';
import { ExplorePage } from './components/ExplorePage';
import { MyCareerPage } from './components/MyCareerPage';
import { TalentRadarPage } from './components/TalentRadarPage';
import { AuthPage } from './components/AuthPage';
import { ProfilePage } from './components/ProfilePage';
import { HelpPage } from './components/HelpPage';
import { getAuthToken, getProfile, logout } from './api';
import type { AuthResponse, UserProfile } from './types';
import logoUrl from '../assets/Logo.svg';

type Page = 'explore' | 'my-career' | 'talent-radar' | 'profile' | 'help';

const NAV_ITEMS: { id: Page; label: string; icon: typeof Compass; description: string }[] = [
  { id: 'explore',      label: 'Khám phá',           icon: Compass,     description: 'Duyệt lộ trình chuyên môn' },
  { id: 'my-career',   label: 'Nghề nghiệp của tôi', icon: MapPin,      description: 'Vị trí và hướng phát triển' },
  { id: 'talent-radar',label: 'Talent Radar',         icon: Radar,       description: 'Phân tích nhân sự' },
  { id: 'profile',     label: 'Hồ sơ cá nhân',        icon: User,        description: 'Tài khoản và hồ sơ' },
  { id: 'help',        label: 'Hướng dẫn',            icon: HelpCircle,  description: 'Hướng dẫn sử dụng' },
];

const PAGE_LABELS: Record<Page, string[]> = {
  explore:       ['Trang chủ', 'Khám phá'],
  'my-career':   ['Trang chủ', 'Nghề nghiệp của tôi'],
  'talent-radar':['Trang chủ', 'Talent Radar'],
  profile:       ['Trang chủ', 'Hồ sơ cá nhân'],
  help:          ['Trang chủ', 'Hướng dẫn sử dụng'],
};

const ROLE_LABEL: Record<UserProfile['role'], string> = {
  employee: 'Nhân viên',
  hr: 'HR',
  leadership: 'Leadership',
};

function canAccessTalentRadar(user: UserProfile): boolean {
  return user.role === 'hr' || user.role === 'leadership';
}

function canEditTitles(user: UserProfile): boolean {
  return user.role === 'hr' || user.role === 'leadership';
}

export default function App() {
  const [page, setPage] = useState<Page>('explore');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    if (!getAuthToken()) return;
    let active = true;
    getProfile()
      .then(profile => {
        if (!active) return;
        setUser(profile);
        if (!canAccessTalentRadar(profile) && page === 'talent-radar') {
          setPage('my-career');
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleAuthenticated(response: AuthResponse) {
    setUser(response.user);
    setPage('my-career');
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setPage('explore');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const breadcrumbs = PAGE_LABELS[page];
  const visibleNavItems = NAV_ITEMS.filter(item =>
    item.id !== 'talent-radar' || canAccessTalentRadar(user)
  );
  const displayName = user.full_name || user.display_name || user.username;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0]?.toUpperCase())
    .join('') || user.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 64,
          background: 'var(--sidebar)',
          transition: 'width 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--sidebar-border)', minHeight: 56 }}>
          <img src={logoUrl} alt="Logo" className="rounded-lg shrink-0 object-contain bg-white" style={{ width: 44, height: 32 }} />
          {sidebarOpen && (
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', lineHeight: 1.2 }}>CASSOR</div>
              <div style={{ color: 'var(--sidebar-foreground)', fontSize: 10, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>HRM Platform</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {sidebarOpen && (
            <div className="px-2 py-1.5 mb-1">
              <span style={{ fontSize: 10, color: 'var(--sidebar-foreground)', opacity: 0.45, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Menu chính
              </span>
            </div>
          )}
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarOpen ? '9px 10px' : '9px',
                  borderRadius: 7,
                  background: active ? 'var(--sidebar-primary)' : 'transparent',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background 0.15s',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-accent)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Icon size={17} color={active ? 'white' : 'var(--sidebar-foreground)'} style={{ opacity: active ? 1 : 0.7, shrink: 0 }} />
                {sidebarOpen && (
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? 'white' : 'var(--sidebar-foreground)', opacity: active ? 1 : 0.8, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-2 py-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          {/* User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginTop: 4, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sidebar-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, flexShrink: 0 }}>
              <User size={14} color="white" />
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sidebar-foreground)' }}>{displayName}</div>
                <div style={{ fontSize: 10, color: 'var(--sidebar-foreground)', opacity: 0.5 }}>{ROLE_LABEL[user.role]}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 flex items-center justify-between shrink-0" style={{ height: 56 }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded hover:bg-accent transition-colors">
              {sidebarOpen ? <X size={16} className="text-muted-foreground" /> : <Menu size={16} className="text-muted-foreground" />}
            </button>
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={13} className="text-muted-foreground" />}
                  <span style={{ fontSize: 13, color: i === breadcrumbs.length - 1 ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded hover:bg-accent transition-colors relative">
              <Bell size={16} className="text-muted-foreground" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button onClick={() => setPage('profile')} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <User size={12} color="white" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{initials}</span>
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded hover:bg-accent transition-colors" title="Đăng xuất">
              <LogOut size={16} className="text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {page === 'explore' && <ExplorePage canEditTitles={canEditTitles(user)} />}
          {page === 'my-career' && <MyCareerPage canEditTitles={canEditTitles(user)} />}
          {page === 'talent-radar' && canAccessTalentRadar(user) && <TalentRadarPage />}
          {page === 'profile' && <ProfilePage user={user} />}
          {page === 'help' && <HelpPage />}
        </main>
      </div>
    </div>
  );
}
