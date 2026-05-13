import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout';
import { Button, Card, Input } from '../components/ui';
import { login, register, resendVerification, verifyEmail } from '../lib/api';
import { saveSession } from '../lib/auth';

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const nav = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const redirectTo = typeof location.state?.from === 'string' ? location.state.from : '';

  function redirectAfterLogin(userRole: string) {
    nav(redirectTo || (userRole === 'admin' || userRole === 'super_admin' ? '/admin' : '/dashboard'), { replace: true });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    try {
      if (mode === 'login') {
        const res = await login(email, String(f.get('password')));
        saveSession(res.access_token || res.token, res.user, res.refresh_token);
        redirectAfterLogin(res.user.role);
        return;
      }

      const res = await register(String(f.get('name')), email, String(f.get('phone')), String(f.get('password')));
      setPendingEmail(res.email);
      setNotice('Verification code sent. Check your email and enter the code.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (mode === 'login' && message === 'email is not verified') {
        setPendingEmail(email);
        setNotice('Email is not verified. Enter your code or request a new one.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitVerification(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const f = new FormData(e.currentTarget);
    try {
      const res = await verifyEmail(pendingEmail, String(f.get('code')));
      saveSession(res.access_token || res.token, res.user, res.refresh_token);
      redirectAfterLogin(res.user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSaving(false);
    }
  }

  async function resendCode() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await resendVerification(pendingEmail);
      setNotice('New verification code sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code');
    } finally {
      setSaving(false);
    }
  }

  if (pendingEmail) {
    return <Card className="mx-auto max-w-md p-6"><form onSubmit={submitVerification} className="space-y-4"><div><h1 className="text-2xl font-bold">Confirm email</h1><p className="text-sm text-muted">Code sent to {pendingEmail}.</p></div><label className="text-sm font-semibold">Verification code<Input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required disabled={saving} /></label>{notice && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button className="w-full" disabled={saving}>{saving ? 'Please wait...' : 'Verify email'}</Button><Button type="button" variant="secondary" className="w-full" disabled={saving} onClick={resendCode}>Resend code</Button><p className="text-center text-sm text-muted"><button type="button" className="font-semibold text-brand-600" onClick={() => setPendingEmail('')}>Use another email</button></p></form></Card>;
  }

  return <Card className="mx-auto max-w-md p-6"><form onSubmit={submit} className="space-y-4"><div><h1 className="text-2xl font-bold capitalize">{mode}</h1><p className="text-sm text-muted">{mode === 'login' ? 'Welcome back to RentCar.' : 'Create an account to book cars.'}</p></div>{mode === 'register' && <label className="text-sm font-semibold">Full name<Input name="name" required disabled={saving} /></label>}{mode === 'register' && <label className="text-sm font-semibold">Phone number<Input name="phone" type="tel" placeholder="+998 90 123 45 67" disabled={saving} /></label>}<label className="text-sm font-semibold">Email<Input name="email" type="email" required disabled={saving} /></label><label className="text-sm font-semibold">Password<Input name="password" type="password" required minLength={6} disabled={saving} /></label>{notice && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button className="w-full" disabled={saving}>{saving ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}</Button><p className="text-center text-sm text-muted">{mode === 'login' ? <>No account? <Link className="font-semibold text-brand-600" to="/register">Register</Link></> : <>Already registered? <Link className="font-semibold text-brand-600" to="/login">Login</Link></>}</p></form></Card>;
}
export function LoginPage() { return <><SiteHeader /><main className="px-4 py-12"><AuthForm mode="login" /></main></>; }
export function RegisterPage() { return <><SiteHeader /><main className="px-4 py-12"><AuthForm mode="register" /></main></>; }
