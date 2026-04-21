import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/axios';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const navigate = useNavigate();
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
      toast.success('Account created! Please complete payment to continue.');
      navigate('/pending-payment');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input id="confirm" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
