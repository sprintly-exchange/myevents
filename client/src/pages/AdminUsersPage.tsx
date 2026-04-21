import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Plan } from '@/types';

export default function AdminUsersPage() {
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
      toast.success('User updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const resolveUpgradeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/upgrade-requests/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Request resolved');
    },
    onError: () => toast.error('Failed to resolve request'),
  });

  const users: User[] = usersData?.users || [];
  const plans: Plan[] = plansData?.plans || [];
  const upgradeRequests = upgradeData?.requests || [];
  const pendingRequests = upgradeRequests.filter((r: any) => r.status === 'pending');

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage user accounts</p>
        </div>

        {pendingRequests.length > 0 && (
          <Card className="mb-6 border-orange-200">
            <CardHeader>
              <CardTitle className="text-base text-orange-700">Pending Upgrade Requests ({pendingRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{req.user_name} ({req.user_email})</p>
                      <p className="text-xs text-gray-500">Wants to upgrade to <strong>{req.plan_name}</strong></p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => resolveUpgradeMutation.mutate({ id: req.id, status: 'approved' })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveUpgradeMutation.mutate({ id: req.id, status: 'rejected' })}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />All Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.plan_id || ''}
                          onValueChange={(val) => updateMutation.mutate({ id: user.id, data: { plan_id: val } })}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
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
                          <SelectTrigger className="h-8 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'success' : 'destructive'}>
                          {user.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMutation.mutate({ id: user.id, data: { is_active: !user.is_active } })}
                        >
                          {user.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
