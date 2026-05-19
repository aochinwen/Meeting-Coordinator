'use server';

import { createClient } from '@/utils/supabase/server';

/** Update the user's profile (name, org, division, rank) in the people table */
export async function updateProfile(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Name cannot be empty.' };
  if (name.length > 100) return { error: 'Name must be 100 characters or fewer.' };

  const organization = (formData.get('organization') as string)?.trim() || null;
  const division = (formData.get('division') as string)?.trim() || null;
  const rank = (formData.get('rank') as string)?.trim() || null;
  const now = new Date().toISOString();

  // Find record by email OR id (handles both legacy trigger-created and directory-added records)
  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('people')
      .update({ name, organization, division, rank, updated_at: now })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('people')
      .insert({ id: user.id, name, email: user.email, organization, division, rank });
    if (error) return { error: error.message };
  }

  return { success: 'Profile updated.' };
}

/** Change the user's email address (requires email confirmation) */
export async function updateEmail(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email) return { error: 'Email cannot be empty.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Invalid email address.' };

  if (email === user.email) return { error: 'That is already your current email.' };

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };

  // Optimistically update people and user_approvals tables
  await supabase.from('people').update({ email }).eq('id', user.id);
  await supabase.from('user_approvals').update({ email }).eq('user_id', user.id);

  return {
    success: 'A confirmation link has been sent to your new email address. Please confirm it to complete the change.',
  };
}

/** Change the user's password */
export async function updatePassword(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All password fields are required.' };
  }

  if (newPassword.length < 8) return { error: 'New password must be at least 8 characters.' };
  if (newPassword !== confirmPassword) return { error: 'Passwords do not match.' };

  // Verify current password by attempting re-auth
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) return { error: 'Current password is incorrect.' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: 'Password changed successfully.' };
}
