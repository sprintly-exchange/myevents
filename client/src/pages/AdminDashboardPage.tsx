import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, CreditCard, FileText, Settings, Bell, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data),
  });

  const { data: upgradeData } = useQuery({
    queryKey: ['admin-upgrade-requests'],
    queryFn: () => api.get('/admin/upgrade-requests').then(r => r.data),
  });

  const users = usersData?.users || [];
  const plans = plansData?.plans || [];
  const upgradeRequests = (upgradeData?.requests || []).filter((r: any) => r.status === 'pending');

  const stats = [
    {
      label: t('admin.dashboard.totalUsers'),
      value: users.length,
      icon: <Users className="h-5 w-5" />,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/30',
      border: 'border-l-blue-500',
      to: '/admin/users',
    },
    {
      label: 'Active Plans',
      value: plans.length,
      icon: <CreditCard className="h-5 w-5" />,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/30',
      border: 'border-l-emerald-500',
      to: '/admin/plans',
    },
    {
      label: t('admin.dashboard.pendingPayments'),
      value: upgradeRequests.length,
      icon: <Bell className="h-5 w-5" />,
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/30',
      border: 'border-l-amber-500',
      to: '/admin/users',
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.dashboard.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to}>
              <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 border-l-4 ${stat.border} p-6 hover:shadow-md transition-all cursor-pointer group`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.iconBg} shadow-lg ${stat.shadow} text-white`}>
                    {stat.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Upgrade Requests */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">{t('admin.users.pendingUpgradeRequests')}</h2>
              <Link to="/admin/users" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                {t('common.viewAll')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-6 pt-4">
              {upgradeRequests.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">No pending requests</p>
              ) : (
                <div className="space-y-2.5">
                  {upgradeRequests.slice(0, 5).map((req: any) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{req.user_name}</p>
                        <p className="text-xs text-slate-500">{req.user_email} → {req.plan_name}</p>
                      </div>
                      <Badge variant="warning">{t('common.pending')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
            <div className="p-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="p-6 pt-4 space-y-1.5">
              {[
                { to: '/admin/users', icon: <Users className="h-4 w-4 text-blue-500" />, label: 'Manage Users', desc: 'View and edit user accounts' },
                { to: '/admin/plans', icon: <CreditCard className="h-4 w-4 text-emerald-500" />, label: 'Manage Plans', desc: 'Configure subscription plans' },
                { to: '/admin/templates', icon: <FileText className="h-4 w-4 text-violet-500" />, label: 'Email Templates', desc: 'Edit invitation templates' },
                { to: '/admin/settings', icon: <Settings className="h-4 w-4 text-slate-500" />, label: 'App Settings', desc: 'SMTP, Swish & more' },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
