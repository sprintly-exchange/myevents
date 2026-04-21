import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Calendar, Mail, TrendingUp, LogOut,
  Settings, Users, CreditCard, FileText, Shield, Menu, X, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { to: string; label: string; icon: React.ReactNode; }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'sv' ? 'en' : 'sv');
  };

  const navItems: NavItem[] = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/events', label: t('nav.myEvents'), icon: <Calendar className="h-4 w-4" /> },
    { to: '/invitations', label: t('nav.myInvitations'), icon: <Mail className="h-4 w-4" /> },
    { to: '/upgrade', label: t('nav.upgradePlan'), icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const adminItems: NavItem[] = [
    { to: '/admin', label: t('nav.adminDashboard'), icon: <Shield className="h-4 w-4" /> },
    { to: '/admin/users', label: t('nav.users'), icon: <Users className="h-4 w-4" /> },
    { to: '/admin/plans', label: t('nav.plans'), icon: <CreditCard className="h-4 w-4" /> },
    { to: '/admin/templates', label: t('nav.templates'), icon: <FileText className="h-4 w-4" /> },
    { to: '/admin/settings', label: t('common.settings'), icon: <Settings className="h-4 w-4" /> },
  ];

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between p-5">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">MyEvents</span>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive(item.to)
                ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-l-2 border-transparent'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-4 px-3">
              <div className="border-t border-slate-700/60" />
              <p className="mt-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">{t('common.admin')}</p>
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  location.pathname === item.to
                    ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-l-2 border-transparent'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-indigo-600 text-white text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        {user?.plan_name && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {user.plan_name}
            </span>
          </div>
        )}
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <Globe className="h-4 w-4" />
          <span className="flex-1 text-left">{i18n.language === 'sv' ? 'Svenska' : 'English'}</span>
          <span className="text-xs bg-slate-700 rounded px-1.5 py-0.5 font-mono">
            {i18n.language === 'sv' ? '🇸🇪' : '🇬🇧'}
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('common.logout')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible; mobile: slide-in drawer */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 flex-shrink-0 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">MyEvents</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

