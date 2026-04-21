import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your MyEvents platform</p>
        </div>

        <Tabs defaultValue="smtp">
          <TabsList className="mb-6">
            <TabsTrigger value="smtp">SMTP Email</TabsTrigger>
            <TabsTrigger value="swish">Swish Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="smtp">
            <Card>
              <CardHeader>
                <CardTitle>Email (SMTP) Settings</CardTitle>
                <CardDescription>Configure SMTP server for sending invitation emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.gmail.com" value={smtpForm.smtp_host}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>SMTP Port</Label>
                    <Input placeholder="587" value={smtpForm.smtp_port}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Username</Label>
                    <Input placeholder="your@email.com" value={smtpForm.smtp_user}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Password</Label>
                    <Input type="password" placeholder="••••••••" value={smtpForm.smtp_pass}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_pass: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>From Address</Label>
                    <Input placeholder="noreply@myevents.se" value={smtpForm.smtp_from}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_from: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={saveSmtp} disabled={saveSettings.isPending}>
                    {saveSettings.isPending ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Send Test Email</Label>
                  <div className="flex gap-2">
                    <Input placeholder="test@example.com" value={testEmail}
                      onChange={e => setTestEmail(e.target.value)} />
                    <Button variant="outline" onClick={() => testEmailMutation.mutate(testEmail)}
                      disabled={testEmailMutation.isPending || !testEmail}>
                      {testEmailMutation.isPending ? 'Sending...' : 'Send Test'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swish">
            <Card>
              <CardHeader>
                <CardTitle>Swish Payment Settings</CardTitle>
                <CardDescription>Configure Swish details for user registration payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Swish Number</Label>
                    <Input placeholder="1234567890" value={swishForm.swish_number}
                      onChange={e => setSwishForm({ ...swishForm, swish_number: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Account Holder Name</Label>
                    <Input placeholder="MyEvents AB" value={swishForm.swish_holder_name}
                      onChange={e => setSwishForm({ ...swishForm, swish_holder_name: e.target.value })} />
                  </div>
                </div>
                <Button onClick={saveSwish} disabled={saveSettings.isPending}>
                  {saveSettings.isPending ? 'Saving...' : 'Save Swish Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
