import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        navigate('/pending-payment', { state: err.response.data });
        return;
      }
      const message = axios.isAxiosError(err) ? err.response?.data?.error : 'Login failed';
      toast.error(message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome back</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Your password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link>
      </p>
    </AuthLayout>
  );
}
