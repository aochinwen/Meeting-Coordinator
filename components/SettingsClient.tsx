'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { updateProfile, updateEmail, updatePassword } from '@/app/actions/settings';
import { RankCombobox } from '@/components/ui/RankCombobox';
import { User, Mail, Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface Props {
  userId: string;
  currentEmail: string;
  currentName: string;
  currentOrganization: string;
  currentDivision: string;
  currentRank: string;
}

function StatusMessage({ state }: { state: { error?: string; success?: string } | undefined }) {
  if (!state?.error && !state?.success) return null;
  const isError = Boolean(state.error);
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
        isError
          ? 'bg-coral-bg text-coral-text'
          : 'bg-[#d8f0de] text-[#2a6038]'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      )}
      <span>{state.error ?? state.success}</span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-[24px] p-6 flex flex-col gap-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary font-['Literata',serif]">{title}</h2>
          <p className="text-sm font-light text-text-tertiary mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function InputField({
  label,
  id,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  id: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function PasswordField({
  label,
  id,
  name,
  autoComplete,
  required,
}: {
  label: string;
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required={required}
          className="w-full px-4 py-3 pr-11 bg-surface border-none rounded-2xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}

export function SettingsClient({
  currentEmail,
  currentName,
  currentOrganization,
  currentDivision,
  currentRank,
}: Props) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, undefined);
  const [emailState, emailAction, emailPending] = useActionState(updateEmail, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, undefined);

  const [rank, setRank] = useState(currentRank);

  const passwordFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (passwordState?.success) {
      passwordFormRef.current?.reset();
    }
  }, [passwordState]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary font-['Literata',serif] mb-1">
          Settings
        </h1>
        <p className="text-sm font-light text-text-tertiary">
          Manage your account details and security.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile */}
        <SectionCard
          icon={User}
          title="Profile"
          description="Your name, organisation, and role appear across meetings, checklists, and the people directory."
        >
          <form action={profileAction} className="flex flex-col gap-4">
            <InputField
              label="Name"
              id="name"
              name="name"
              defaultValue={currentName}
              placeholder="Your full name"
              autoComplete="name"
              required
            />
            <InputField
              label="Organisation"
              id="organization"
              name="organization"
              defaultValue={currentOrganization}
              placeholder="e.g. Acme Corp"
              autoComplete="organization"
            />
            <InputField
              label="Division"
              id="division"
              name="division"
              defaultValue={currentDivision}
              placeholder="e.g. Engineering"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rank-combobox" className="text-sm font-semibold text-text-primary">
                Rank / Role
              </label>
              <RankCombobox
                id="rank-combobox"
                value={rank}
                onChange={setRank}
              />
              <input type="hidden" name="rank" value={rank} />
            </div>
            <StatusMessage state={profileState} />
            <SubmitButton pending={profilePending} label="Save Profile" />
          </form>
        </SectionCard>

        {/* Email Address */}
        <SectionCard
          icon={Mail}
          title="Email Address"
          description="Changing your email will send a confirmation link to the new address."
        >
          <form action={emailAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Current Email</label>
              <p className="px-4 py-3 bg-surface rounded-2xl text-sm text-text-secondary font-light select-all">
                {currentEmail}
              </p>
            </div>
            <InputField
              label="New Email Address"
              id="email"
              name="email"
              type="email"
              placeholder="new@example.com"
              autoComplete="email"
              required
            />
            <StatusMessage state={emailState} />
            <SubmitButton pending={emailPending} label="Update Email" />
          </form>
        </SectionCard>

        {/* Password */}
        <SectionCard
          icon={Lock}
          title="Change Password"
          description="Use a strong password of at least 8 characters."
        >
          <form ref={passwordFormRef} action={passwordAction} className="flex flex-col gap-4">
            <PasswordField
              label="Current Password"
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
            <PasswordField
              label="New Password"
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              required
            />
            <PasswordField
              label="Confirm New Password"
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
            <StatusMessage state={passwordState} />
            <SubmitButton pending={passwordPending} label="Change Password" />
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
