'use client';

import { useActionState } from 'react';
import { forgotPassword } from '@/app/actions/auth';
import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <div className="min-h-screen flex bg-[#faf6f0]">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#4a7c59] via-[#3f664a] to-[#2a6038] p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
        
        <div className="relative z-10 text-center text-white">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-['Literata',serif] mb-3">Reset Password</h1>
          <p className="text-white/70 text-lg font-light leading-relaxed max-w-xs mx-auto">
            We'll send you instructions to reset your password.
          </p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#4a7c59] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-['Literata',serif] text-[#2e3230]">Reset Password</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-[#4a7c59]/10 p-8">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-sm text-[#78716c] hover:text-[#4a7c59] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>

            <h2 className="text-2xl font-bold text-[#2e3230] font-['Literata',serif] mb-2">
              Forgot your password?
            </h2>
            <p className="text-[#78716c] text-sm mb-7">
              Enter your email and we'll send you instructions to reset your password.
            </p>

            <form action={action} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium text-[#4a4e4a] uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-[#2e3230] placeholder:text-[#78716c] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 focus:border-[#4a7c59] transition-all text-sm"
                />
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
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4a7c59] hover:bg-[#3f664a] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                {pending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {pending ? 'Sending…' : 'Send Reset Instructions'}
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
