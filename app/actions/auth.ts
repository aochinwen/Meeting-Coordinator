'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/** Sign in with email + password */
export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Check if user is approved
  const user = data.user;
  const isAdmin = user?.email === 'chinwen.ao@gmail.com';
  
  if (!isAdmin && user) {
    const { data: approval } = await supabase
      .from('user_approvals')
      .select('status')
      .eq('user_id', user.id)
      .single();
    
    if (approval?.status !== 'approved') {
      redirect('/pending-approval');
    }
  }

  redirect('/');
}

/** Create a new account with email + password */
export async function signup(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    // Note: Email confirmation is disabled in Supabase.
    // User accounts are activated via admin approval only.
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      'Account created! Please wait for administrator approval before you can sign in.',
  };
}

/** Sign out and redirect to /login */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/** Request password reset email */
export async function forgotPassword(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: 'Password reset instructions sent to your email.',
  };
}

/** Reset password with token */
export async function resetPassword(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password) {
    return { error: 'Password is required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: 'Password updated successfully! You can now sign in.',
  };
}

/** Bootstrap admin user - auto-creates and approves admin if not exists */
export async function bootstrapAdmin() {
  const supabase = await createClient();
  const ADMIN_EMAIL = 'chinwen.ao@gmail.com';

  // Check if admin user exists in auth.users via RPC
  const { data: authUsers } = await supabase.rpc('check_admin_exists', {
    admin_email: ADMIN_EMAIL,
  });

  const authUser = authUsers?.[0];

  // Also check user_approvals
  const { data: approvalRecord } = await supabase
    .from('user_approvals')
    .select('*')
    .eq('email', ADMIN_EMAIL)
    .single();

  // If admin exists in auth but no approval record, create one
  if (authUser?.user_exists && !approvalRecord) {
    await supabase
      .from('user_approvals')
      .insert({
        user_id: authUser.user_id,
        email: ADMIN_EMAIL,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: authUser.user_id,
      });
    return { exists: true, email: ADMIN_EMAIL };
  }

  // If admin exists and has approval record, ensure it's approved
  if (approvalRecord) {
    if (approvalRecord.status !== 'approved') {
      await supabase
        .from('user_approvals')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvalRecord.user_id,
        })
        .eq('user_id', approvalRecord.user_id);
    }
    return { exists: true, email: ADMIN_EMAIL };
  }

  return { exists: false, email: ADMIN_EMAIL };
}
