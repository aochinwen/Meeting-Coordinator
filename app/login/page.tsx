import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function LoginPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already logged in, redirect to dashboard
  if (user) {
    return redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-board">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary font-literata mb-2">
            Welcome Back
          </h1>
          <p className="text-text-secondary">
            Sign in to access your meeting dashboard
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all"
          >
            Continue to Dashboard
          </Link>
          
          <p className="text-center text-sm text-text-tertiary">
            Authentication will be implemented with Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
