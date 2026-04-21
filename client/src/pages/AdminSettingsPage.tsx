import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, CreditCard, Lock, Send } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminSettingsPage() {
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
  });
  const [swishForm, setSwishForm] = useState({
    swish_number: '', swish_holder_name: '',
  });
  const [testEmail, setTestEmail] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data),
  });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setSmtpForm({
        smtp_host: s.smtp_host || '',
        smtp_port: s.smtp_port || '587',
        smtp_user: s.smtp_user || '',
        smtp_pass: s.smtp_pass || '',
        smtp_from: s.smtp_from || '',
      });
      setSwishForm({
        swish_number: s.swish_number || '',
        swish_holder_name: s.swish_holder_name || '',
      });
    }
  }, [data]);

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const changePassword = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post('/admin/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const handleChangePassword = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password)
      return toast.error('New passwords do not match');
    changePassword.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  const saveSettings = useMutation({
    mutationFn: (settings: { key: string; value: string }[]) =>
      api.post('/admin/settings', { settings }),
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  });

  const testEmailMutation = useMutation({
    mutationFn: (to: string) => api.post('/admin/settings/test-email', { to }),
    onSuccess: () => toast.success('Test email sent successfully!'),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to send test email'),
  });

  const saveSmtp = () => {
    const settings = Object.entries(smtpForm).map(([key, value]) => ({ key, value }));
    saveSettings.mutate(settings);
  };

  const saveSwish = () => {
    const settings = Object.entries(swishForm).map(([key, value]) => ({ key, value }));
    saveSettings.mutate(settings);
  };

  const fieldClass = "border-slate-200 focus:border-blue-400 h-10";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your MyEvents platform</p>
        </div>

        <Tabs defaultValue="smtp">
          <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="smtp" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Mail className="h-3.5 w-3.5" />SMTP Email
            </TabsTrigger>
            <TabsTrigger value="swish" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="h-3.5 w-3.5" />Swish Payment
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Lock className="h-3.5 w-3.5" />Change Password
            </TabsTrigger>
          </TabsList>

          {/* SMTP Tab */}
          <TabsContent value="smtp">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Email (SMTP) Settings</h2>
                    <p className="text-xs text-slate-500">Configure SMTP server for sending invitation emails</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">SMTP Host</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtpForm.smtp_host}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">SMTP Port</Label>
                    <Input
                      placeholder="587"
                      value={smtpForm.smtp_port}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Username</Label>
                    <Input
                      placeholder="your@email.com"
                      value={smtpForm.smtp_user}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={smtpForm.smtp_pass}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_pass: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm font-medium text-slate-700">From Address</Label>
                    <Input
                      placeholder="noreply@myevents.se"
                      value={smtpForm.smtp_from}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_from: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={saveSmtp} disabled={saveSettings.isPending} className="bg-blue-600 hover:bg-blue-700">
                    {saveSettings.isPending ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Send Test Email</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      className={fieldClass + ' flex-1'}
                    />
                    <Button
                      variant="outline"
                      className="border-slate-200"
                      onClick={() => testEmailMutation.mutate(testEmail)}
                      disabled={testEmailMutation.isPending || !testEmail}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {testEmailMutation.isPending ? 'Sending...' : 'Send Test'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Swish Tab */}
          <TabsContent value="swish">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Swish Payment Settings</h2>
                    <p className="text-xs text-slate-500">Configure Swish details for user registration payment</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Swish Number</Label>
                    <Input
                      placeholder="1234567890"
                      value={swishForm.swish_number}
                      onChange={e => setSwishForm({ ...swishForm, swish_number: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Account Holder Name</Label>
                    <Input
                      placeholder="MyEvents AB"
                      value={swishForm.swish_holder_name}
                      onChange={e => setSwishForm({ ...swishForm, swish_holder_name: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <Button onClick={saveSwish} disabled={saveSettings.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {saveSettings.isPending ? 'Saving...' : 'Save Swish Settings'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Lock className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>
                    <p className="text-xs text-slate-500">Update your admin account password</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Current Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.current_password}
                    onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePassword.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {changePassword.isPending ? 'Saving...' : 'Change Password'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
