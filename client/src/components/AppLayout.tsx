import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, Calendar, Mail, TrendingUp, LogOut,
  Settings, Users, CreditCard, FileText, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/events', label: 'My Events', icon: <Calendar className="h-4 w-4" /> },
    { to: '/invitations', label: 'My Invitations', icon: <Mail className="h-4 w-4" /> },
    { to: '/upgrade', label: 'Upgrade Plan', icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const adminItems: NavItem[] = [
    { to: '/admin', label: 'Admin Dashboard', icon: <Shield className="h-4 w-4" /> },
    { to: '/admin/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { to: '/admin/plans', label: 'Plans', icon: <CreditCard className="h-4 w-4" /> },
    { to: '/admin/templates', label: 'Templates', icon: <FileText className="h-4 w-4" /> },
    { to: '/admin/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">MyEvents</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <Separator className="my-3" />
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin</p>
              {adminItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    location.pathname === item.to
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
