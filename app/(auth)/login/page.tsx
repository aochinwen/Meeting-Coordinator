'use client';

import { useActionState, useState, useEffect } from 'react';
import { login, signup, bootstrapAdmin } from '@/app/actions/auth';
import { Eye, EyeOff, Loader2, LogIn, UserPlus, Shield, UserCog } from 'lucide-react';
import Link from 'next/link';

type Tab = 'login' | 'signup';

function PasswordInput({
  id,
  name,
  placeholder,
}: {
  id: string;
  name: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        required
        className="w-full px-4 py-3 pr-12 rounded-xl border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-[#2e3230] placeholder:text-[#78716c] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 focus:border-[#4a7c59] transition-all text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#4a7c59] transition-colors p-1"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="login-email" className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-[#2e3230] placeholder:text-[#78716c] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 focus:border-[#4a7c59] transition-all text-sm"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
            Password
          </label>
          <Link 
            href="/forgot-password" 
            className="text-xs text-[#4a7c59] hover:text-[#3f664a] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="login-password" name="password" placeholder="••••••••" />
      </div>

      {state?.error && (
        <p className="text-sm text-[#690005] bg-[#ffdad8] rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠</span>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        id="login-submit-btn"
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <LogIn className="w-4 h-4 text-white" />
        )}
        <span className="text-white">{pending ? 'Signing in…' : 'Sign In'}</span>
      </button>
    </form>
  );
}

function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="signup-email" className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-[#2e3230] placeholder:text-[#78716c] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 focus:border-[#4a7c59] transition-all text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="signup-password" className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
          Password
        </label>
        <PasswordInput id="signup-password" name="password" placeholder="Min. 8 characters" />
      </div>

      <div className="space-y-1">
        <label htmlFor="signup-confirm-password" className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
          Confirm Password
        </label>
        <PasswordInput id="signup-confirm-password" name="confirmPassword" placeholder="Repeat your password" />
      </div>

      {state?.error && (
        <p className="text-sm text-[#690005] bg-[#ffdad8] rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠</span>
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="text-sm text-[#2a6038] bg-[#d8f0de] rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">✓</span>
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        id="signup-submit-btn"
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <UserPlus className="w-4 h-4 text-white" />
        )}
        <span className="text-white">{pending ? 'Creating account…' : 'Create Account'}</span>
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  useEffect(() => {
    // Check if admin needs bootstrapping on first load
    async function checkAdmin() {
      const result = await bootstrapAdmin();
      // Show setup banner if admin doesn't exist yet
      setShowAdminSetup(!result.exists);
    }
    checkAdmin();
  }, []);

  return (
    <div className="min-h-screen flex bg-[#faf6f0]">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#4a7c59] via-[#3f664a] to-[#2a6038] p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-8 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10 text-center text-white">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-3xl font-['Literata',serif]">O</span>
          </div>
          <h1 className="text-4xl font-bold font-['Literata',serif] mb-3">The Organizer</h1>
          <p className="text-white/70 text-lg font-light leading-relaxed max-w-xs mx-auto">
            Your central hub for meetings, templates, and team coordination.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-4 text-left">
            {[
              { icon: '📅', label: 'Meeting Scheduling', desc: 'Conflict-free room & calendar management' },
              { icon: '📋', label: 'Checklists', desc: 'Keep every meeting on track' },
              { icon: '👥', label: 'Directory', desc: 'Manage participants and roles' },
              { icon: '🔐', label: 'Admin Approved', desc: 'Secure access with administrator approval' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 bg-white/10 rounded-2xl px-4 py-3">
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-white/60 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#4a7c59] flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-xl font-['Literata',serif]">O</span>
            </div>
            <h1 className="text-2xl font-bold font-['Literata',serif] text-[#2e3230]">The Organizer</h1>
          </div>

          {/* First-time admin setup banner */}
          {showAdminSetup && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 text-sm mb-1">
                    First-Time Setup Required
                  </h3>
                  <p className="text-amber-800 text-sm leading-relaxed mb-3">
                    Sign up as <strong>chinwen.ao@gmail.com</strong> to create the admin account. 
                    You'll be automatically approved and can then approve other users.
                  </p>
                  <button
                    onClick={() => setTab('signup')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    Create Admin Account
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl shadow-[#4a7c59]/10 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-[#2e3230] font-['Literata',serif]">
                {tab === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-[#78716c] text-sm mt-1">
                {tab === 'login'
                  ? 'Sign in to access your dashboard.'
                  : 'New accounts require administrator approval before access is granted.'}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-[#f5f1ea] rounded-xl p-1 mb-6">
              <button
                id="tab-login"
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'login'
                    ? 'bg-white text-[#4a7c59] shadow-sm'
                    : 'text-[#78716c] hover:text-[#4a4e4a]'
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-signup"
                type="button"
                onClick={() => setTab('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'signup'
                    ? 'bg-white text-[#4a7c59] shadow-sm'
                    : 'text-[#78716c] hover:text-[#4a4e4a]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {tab === 'login' ? <LoginForm /> : <SignupForm />}
          </div>

          <p className="text-center text-xs text-[#78716c] mt-6">
            Protected by Supabase Auth · End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
