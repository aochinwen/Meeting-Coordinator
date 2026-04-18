'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from '@/app/actions/auth';
import { Loader2, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function PasswordInput({
  id,
  name,
  placeholder,
  label,
}: {
  id: string;
  name: string;
  placeholder: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          required
          minLength={8}
          className="w-full px-4 py-3 pr-12 rounded-xl border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-[#2e3230] placeholder:text-[#78716c] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 focus:border-[#4a7c59] transition-all text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#4a7c59] transition-colors p-1"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(resetPassword, undefined);
  
  // Check if we have a valid session from the recovery link
  const hasToken = searchParams.has('code') || searchParams.get('type') === 'recovery';

  if (!hasToken) {
    return (
      <div className="min-h-screen flex bg-[#faf6f0]">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#4a7c59]/10 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#2e3230] font-['Literata',serif] mb-2">
                Invalid or Expired Link
              </h2>
              <p className="text-[#78716c] mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#4a7c59] hover:bg-[#3f664a] text-white rounded-xl font-semibold text-sm transition-all"
              >
                Request New Link
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="min-h-screen flex bg-[#faf6f0]">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#4a7c59]/10 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#2e3230] font-['Literata',serif] mb-2">
                Password Updated!
              </h2>
              <p className="text-[#78716c] mb-6">
                {state.success}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#4a7c59] hover:bg-[#3f664a] text-white rounded-xl font-semibold text-sm transition-all"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#faf6f0]">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#4a7c59] via-[#3f664a] to-[#2a6038] p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
        
        <div className="relative z-10 text-center text-white">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-['Literata',serif] mb-3">New Password</h1>
          <p className="text-white/70 text-lg font-light leading-relaxed max-w-xs mx-auto">
            Create a strong, secure password for your account.
          </p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#4a7c59] flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-['Literata',serif] text-[#2e3230]">New Password</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-[#4a7c59]/10 p-8">
            <h2 className="text-2xl font-bold text-[#2e3230] font-['Literata',serif] mb-2">
              Create new password
            </h2>
            <p className="text-[#78716c] text-sm mb-7">
              Your new password must be at least 8 characters long.
            </p>

            <form action={action} className="space-y-4">
              <PasswordInput
                id="password"
                name="password"
                placeholder="Min. 8 characters"
                label="New Password"
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Repeat your password"
                label="Confirm Password"
              />

              {state?.error && (
                <p className="text-sm text-[#690005] bg-[#ffdad8] rounded-xl px-4 py-3 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4a7c59] hover:bg-[#3f664a] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                {pending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {pending ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-[#78716c] mt-6">
            Protected by Supabase Auth · End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
