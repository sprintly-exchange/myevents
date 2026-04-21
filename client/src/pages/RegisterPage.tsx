import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      toast.success(t('auth.accountCreated'));
      navigate('/login?registered=1');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold mb-1">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('auth.createAccountTitle')}
          </span>
        </h2>
        <p className="text-sm text-slate-500">{t('auth.createAccountSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">{t('auth.fullName')}</Label>
          <Input
            id="name"
            placeholder={t('auth.fullNamePlaceholder')}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            className="border-slate-200 focus:border-blue-400 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">{t('common.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="border-slate-200 focus:border-blue-400 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">{t('common.password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            className="border-slate-200 focus:border-blue-400 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium text-slate-700">{t('auth.confirmPassword')}</Label>
          <Input
            id="confirm"
            type="password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            required
            className="border-slate-200 focus:border-blue-400 h-11"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 shadow-md shadow-blue-500/20 mt-2"
          disabled={loading}
        >
          {loading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
