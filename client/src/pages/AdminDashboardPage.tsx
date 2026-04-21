import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, CreditCard, FileText, Settings, Bell } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
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
    { label: 'Total Users', value: users.length, icon: <Users className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50', to: '/admin/users' },
    { label: 'Active Plans', value: plans.length, icon: <CreditCard className="h-5 w-5 text-green-500" />, bg: 'bg-green-50', to: '/admin/plans' },
    { label: 'Pending Upgrades', value: upgradeRequests.length, icon: <Bell className="h-5 w-5 text-orange-500" />, bg: 'bg-orange-50', to: '/admin/users' },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your MyEvents platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between">
                Pending Upgrade Requests
                <Link to="/admin/users" className="text-sm text-primary font-normal hover:underline">View all</Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upgradeRequests.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {upgradeRequests.slice(0, 5).map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 rounded bg-orange-50">
                      <div>
                        <p className="text-sm font-medium">{req.user_name}</p>
                        <p className="text-xs text-gray-500">{req.user_email} → {req.plan_name}</p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { to: '/admin/users', icon: <Users className="h-4 w-4" />, label: 'Manage Users' },
                { to: '/admin/plans', icon: <CreditCard className="h-4 w-4" />, label: 'Manage Plans' },
                { to: '/admin/templates', icon: <FileText className="h-4 w-4" />, label: 'Email Templates' },
                { to: '/admin/settings', icon: <Settings className="h-4 w-4" />, label: 'App Settings' },
              ].map(item => (
                <Link key={item.to} to={item.to} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
