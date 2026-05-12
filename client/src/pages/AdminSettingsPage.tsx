import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, CreditCard, Lock, Send, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentProfile {
  id: string;
  country_code: string;
  method_name: string;
  recipient_label: string;
  recipient_value: string;
  holder_label: string;
  holder_value: string;
  qr_template?: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    id: '',
    country_code: 'SE',
    payment_method_name: 'Swish',
    payment_recipient_label: 'Swish number',
    payment_recipient_value: '',
    payment_holder_label: 'Recipient',
    payment_holder_name: '',
    payment_qr_template: '',
    is_default: true,
    priority: '100',
    is_active: true,
  });
  const [freeTierForm, setFreeTierForm] = useState({ free_tier_invite_limit: '1' });
  const [testEmail, setTestEmail] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data),
  });
  const { data: paymentProfilesData } = useQuery({
    queryKey: ['admin-payment-profiles'],
    queryFn: () => api.get('/admin/payment-profiles').then(r => r.data),
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
      setPaymentForm({
        id: '',
        country_code: 'SE',
        payment_method_name: s.payment_method_name || 'Swish',
        payment_recipient_label: s.payment_recipient_label || 'Swish number',
        payment_recipient_value: s.payment_recipient_value || s.swish_number || '',
        payment_holder_label: s.payment_holder_label || 'Recipient',
        payment_holder_name: s.payment_holder_name || s.swish_holder_name || '',
        payment_qr_template: s.payment_qr_template || '',
        is_default: true,
        priority: '100',
        is_active: true,
      });
      setFreeTierForm({ free_tier_invite_limit: s.free_tier_invite_limit || '1' });
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
    onSuccess: () => toast.success(t('admin.settings.settingsSaved')),
    onError: () => toast.error('Failed to save settings'),
  });

  const testEmailMutation = useMutation({
    mutationFn: (to: string) => api.post('/admin/settings/test-email', { to }),
    onSuccess: () => toast.success(t('admin.settings.testEmailSent')),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to send test email'),
  });

  const saveSmtp = () => {
    const settings = Object.entries(smtpForm).map(([key, value]) => ({ key, value }));
    saveSettings.mutate(settings);
  };

  const savePaymentProfile = useMutation({
    mutationFn: (payload: Record<string, any>) => api.post('/admin/payment-profiles', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-profiles'] });
      toast.success(t('admin.settings.paymentProfileSaved'));
      setPaymentForm({
        id: '',
        country_code: 'SE',
        payment_method_name: 'Swish',
        payment_recipient_label: 'Swish number',
        payment_recipient_value: '',
        payment_holder_label: 'Recipient',
        payment_holder_name: '',
        payment_qr_template: '',
        is_default: true,
        priority: '100',
        is_active: true,
      });
    },
    onError: () => toast.error(t('admin.settings.paymentProfileSaveFailed')),
  });

  const savePayment = () => {
    savePaymentProfile.mutate({
      id: paymentForm.id || undefined,
      country_code: paymentForm.country_code,
      method_name: paymentForm.payment_method_name,
      recipient_label: paymentForm.payment_recipient_label,
      recipient_value: paymentForm.payment_recipient_value,
      holder_label: paymentForm.payment_holder_label,
      holder_value: paymentForm.payment_holder_name,
      qr_template: paymentForm.payment_qr_template,
      is_default: paymentForm.is_default,
      priority: Number(paymentForm.priority),
      is_active: paymentForm.is_active,
    });
  };

  const saveFreeTier = () => {
    saveSettings.mutate([{ key: 'free_tier_invite_limit', value: freeTierForm.free_tier_invite_limit }]);
  };

  const fieldClass = "border-slate-200 focus:border-blue-400 h-10";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.settings.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.settings.subtitle')}</p>
        </div>

        <Tabs defaultValue="smtp">
          <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="smtp" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Mail className="h-3.5 w-3.5" />SMTP Email
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="h-3.5 w-3.5" />{t('admin.settings.paymentSettings')}
            </TabsTrigger>
            <TabsTrigger value="freetier" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5" />Free Tier
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
                    <h2 className="text-sm font-semibold text-slate-900">{t('admin.settings.smtpSettings')}</h2>
                    <p className="text-xs text-slate-500">Configure SMTP server for sending invitation emails</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpHost')}</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtpForm.smtp_host}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpPort')}</Label>
                    <Input
                      placeholder="587"
                      value={smtpForm.smtp_port}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpUser')}</Label>
                    <Input
                      placeholder="your@email.com"
                      value={smtpForm.smtp_user}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpPass')}</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={smtpForm.smtp_pass}
                      onChange={e => setSmtpForm({ ...smtpForm, smtp_pass: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.smtpFrom')}</Label>
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
                    {saveSettings.isPending ? t('admin.settings.saving') : 'Save SMTP Settings'}
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">{t('admin.settings.sendTestEmail')}</Label>
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

          {/* Payment Tab */}
          <TabsContent value="payment">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{t('admin.settings.paymentSettings')}</h2>
                    <p className="text-xs text-slate-500">{t('admin.settings.paymentSettingsHelp')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">{t('admin.settings.savedPaymentProfiles')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(paymentProfilesData?.profiles || []).map((profile: PaymentProfile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className="px-2.5 py-1 text-xs rounded-md border border-slate-200 hover:bg-slate-50"
                        onClick={() => setPaymentForm({
                          id: profile.id,
                          country_code: profile.country_code || 'GLOBAL',
                          payment_method_name: profile.method_name || '',
                          payment_recipient_label: profile.recipient_label || '',
                          payment_recipient_value: profile.recipient_value || '',
                          payment_holder_label: profile.holder_label || '',
                          payment_holder_name: profile.holder_value || '',
                          payment_qr_template: profile.qr_template || '',
                          is_default: !!profile.is_default,
                          priority: String(profile.priority ?? 100),
                          is_active: !!profile.is_active,
                        })}
                      >
                        {profile.country_code} · {profile.method_name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('common.country')}</Label>
                    <Input
                      placeholder="SE / GLOBAL"
                      value={paymentForm.country_code}
                      onChange={e => setPaymentForm({ ...paymentForm, country_code: e.target.value.toUpperCase() })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentMethodName')}</Label>
                    <Input
                      placeholder="Swish"
                      value={paymentForm.payment_method_name}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_method_name: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentRecipientLabel')}</Label>
                    <Input
                      placeholder="IBAN"
                      value={paymentForm.payment_recipient_label}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_recipient_label: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentRecipientValue')}</Label>
                    <Input
                      placeholder="CY17002001280000001200527600"
                      value={paymentForm.payment_recipient_value}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_recipient_value: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentHolderLabel')}</Label>
                    <Input
                      placeholder="Recipient"
                      value={paymentForm.payment_holder_label}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_holder_label: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentHolderName')}</Label>
                    <Input
                      placeholder="MyEvents Ltd"
                      value={paymentForm.payment_holder_name}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_holder_name: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentQrTemplate')}</Label>
                    <Input
                      placeholder="swish://payment?version=1&payee={{recipient}}&amount={{amount}}&message={{reference}}&editable=false"
                      value={paymentForm.payment_qr_template}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_qr_template: e.target.value })}
                      className={fieldClass}
                    />
                    <p className="text-xs text-slate-400">{t('admin.settings.paymentQrTemplateHelp')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.paymentPriority')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={paymentForm.priority}
                      onChange={e => setPaymentForm({ ...paymentForm, priority: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{t('admin.settings.defaultForCountry')}</Label>
                    <select
                      value={paymentForm.is_default ? 'yes' : 'no'}
                      onChange={e => setPaymentForm({ ...paymentForm, is_default: e.target.value === 'yes' })}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-400"
                    >
                      <option value="yes">{t('common.yes')}</option>
                      <option value="no">{t('common.no')}</option>
                    </select>
                  </div>
                </div>
                <Button onClick={savePayment} disabled={savePaymentProfile.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {savePaymentProfile.isPending ? t('admin.settings.saving') : t('admin.settings.savePaymentSettings')}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Free Tier Tab */}
          <TabsContent value="freetier">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <Users className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Free Tier Limits</h2>
                    <p className="text-xs text-slate-500">Configure what unconfirmed (free tier) users can do</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-sm font-medium text-slate-700">Free invitations per event</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={freeTierForm.free_tier_invite_limit}
                      onChange={e => setFreeTierForm({ free_tier_invite_limit: e.target.value })}
                      className={fieldClass + ' w-24 text-center text-lg font-semibold'}
                    />
                    <span className="text-sm text-slate-500">guests per event (0 = none until paid)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Pending users can send up to this many invitations per event before payment is required.
                    Set to <strong>0</strong> to block all invitations until payment is confirmed.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Current behaviour</p>
                  <p>Free tier users can invite up to <strong>{freeTierForm.free_tier_invite_limit || '1'}</strong> guest{freeTierForm.free_tier_invite_limit !== '1' ? 's' : ''} per event. After that, they see an upgrade prompt.</p>
                </div>

                <Button onClick={saveFreeTier} disabled={saveSettings.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {saveSettings.isPending ? t('admin.settings.saving') : 'Save Free Tier Settings'}
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
