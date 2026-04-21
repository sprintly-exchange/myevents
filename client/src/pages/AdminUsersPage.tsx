import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Plan } from '@/types';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/admin/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('admin.users.userUpdated'));
    },
    onError: () => toast.error(t('admin.users.updateFailed')),
  });

  const resolveUpgradeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/upgrade-requests/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('admin.users.requestResolved'));
    },
    onError: () => toast.error(t('admin.users.resolveFailed')),
  });

  const users: User[] = usersData?.users || [];
  const plans: Plan[] = plansData?.plans || [];
  const upgradeRequests = upgradeData?.requests || [];
  const pendingRequests = upgradeRequests.filter((r: any) => r.status === 'pending');

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.users.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.users.subtitle')}</p>
        </div>

        {/* Pending upgrade requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden mb-6">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
              <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                  {pendingRequests.length}
                </span>
                {t('admin.users.pendingUpgradeRequests')}
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {pendingRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div>
                      <p className="font-medium text-sm text-slate-800">{req.user_name} <span className="text-slate-400 font-normal">({req.user_email})</span></p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('admin.users.wantsToUpgrade')} <strong className="text-slate-700">{req.plan_name}</strong>
                        {req.plan_price ? <span className="ml-1 text-slate-400">· {req.plan_price} SEK</span> : null}
                      </p>
                      {req.payment_reference && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-amber-700 font-medium">{t('admin.users.swishRef')}</span>
                          <span className="font-mono text-sm font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md tracking-widest">
                            {req.payment_reference}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => resolveUpgradeMutation.mutate({ id: req.id, status: 'approved' })}
                      >
                        {t('admin.users.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-200 text-slate-600"
                        onClick={() => resolveUpgradeMutation.mutate({ id: req.id, status: 'rejected' })}
                      >
                        {t('admin.users.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">{t('admin.users.allUsers', { count: users.length })}</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-slate-100">
                  <TableHead className="text-slate-600 font-semibold">{t('admin.users.nameEmail')}</TableHead>
                  <TableHead className="text-slate-600 font-semibold">{t('common.role')}</TableHead>
                  <TableHead className="text-slate-600 font-semibold">{t('common.plan')}</TableHead>
                  <TableHead className="text-slate-600 font-semibold">{t('admin.users.payment')}</TableHead>
                  <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                  <TableHead className="text-slate-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id} className="hover:bg-slate-50 border-slate-100">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.plan_id || ''}
                        onValueChange={(val) => updateMutation.mutate({ id: user.id, data: { plan_id: val } })}
                      >
                        <SelectTrigger className="h-8 text-xs w-32 border-slate-200">
                          <SelectValue placeholder="No plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((p: Plan) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.payment_status}
                        onValueChange={(val) => updateMutation.mutate({ id: user.id, data: { payment_status: val } })}
                      >
                        <SelectTrigger className="h-8 text-xs w-28 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('common.pending')}</SelectItem>
                          <SelectItem value="paid">{t('common.paid')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {user.is_active ? t('common.active') : t('common.disabled')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-slate-200 hover:bg-slate-50"
                        onClick={() => updateMutation.mutate({ id: user.id, data: { is_active: !user.is_active } })}
                      >
                        {user.is_active ? t('admin.users.disable') : t('admin.users.enable')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
