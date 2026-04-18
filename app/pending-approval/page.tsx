'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Clock, LogOut, Mail, Loader2 } from 'lucide-react';
import { logout } from '@/app/actions/auth';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      setEmail(user.email || '');

      // Check approval status
      const { data: approval } = await supabase
        .from('user_approvals')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (approval?.status === 'approved') {
        // User was approved, redirect to home
        router.replace('/');
        return;
      }

      setIsLoading(false);
    }

    checkStatus();

    // Poll for approval status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleLogout() {
    setIsPending(true);
    await logout();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf6f0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4a7c59]" />
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
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-['Literata',serif] mb-3">Pending Approval</h1>
          <p className="text-white/70 text-lg font-light leading-relaxed max-w-xs mx-auto">
            Your account is awaiting administrator approval.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#4a7c59] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-['Literata',serif] text-[#2e3230]">Pending Approval</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-[#4a7c59]/10 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f5f1ea] flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-[#4a7c59]" />
            </div>

            <h2 className="text-2xl font-bold text-[#2e3230] font-['Literata',serif] mb-2">
              Account Pending Approval
            </h2>
            
            <p className="text-[#78716c] mb-6">
              <strong className="text-[#4a4e4a]">{email}</strong>
            </p>

            <div className="bg-[#f5f1ea] rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-[#4a4e4a] leading-relaxed">
                Your account has been created and is now awaiting administrator approval. 
                You will be automatically redirected once your access is granted.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-[#78716c] mb-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking approval status...</span>
            </div>

            <form action={handleLogout}>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4a7c59] hover:bg-[#3f664a] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" />
                {isPending ? 'Signing out…' : 'Sign Out'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-[#78716c] mt-6">
            Questions? Contact the administrator at chinwen.ao@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
