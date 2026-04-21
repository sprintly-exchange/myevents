import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      toast.success(t('auth.accountCreated'));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.error;
      toast.error(message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold mb-1">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('auth.signInTitle')}
          </span>
        </h2>
        <p className="text-sm text-slate-500">{t('auth.signInSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            {t('auth.emailOrUsername')}
          </Label>
          <Input
            id="email"
            type="text"
            placeholder={t('auth.emailPlaceholder')}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="border-slate-200 focus:border-blue-400 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            {t('common.password')}
          </Label>
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
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 shadow-md shadow-blue-500/20 mt-2"
          disabled={loading}
        >
          {loading ? t('auth.signingIn') : t('auth.signInButton')}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
          {t('auth.createAccount')}
        </Link>
      </p>
    </AuthLayout>
  );
}
