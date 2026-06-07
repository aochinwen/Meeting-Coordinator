'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalDAVSettingsData {
  caldav_username: string;
  caldav_host: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}

export function CalSyncSettings() {
  const [settings, setSettings] = useState<CalDAVSettingsData | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/caldav/settings')
      .then(r => r.json())
      .then((data: CalDAVSettingsData | null) => {
        if (data) {
          setSettings(data);
          setUsername(data.caldav_username);
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/caldav/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caldav_username: username, caldav_password: password }),
      });
      if (res.ok) {
        setSavedAt(new Date().toISOString());
        setPassword('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/caldav/sync', { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        setSyncResult({ ok: true, message: `Synced ${body.synced} event${body.synced === 1 ? '' : 's'} from your calendar.` });
        setSettings(prev => prev ? { ...prev, last_synced_at: new Date().toISOString(), last_sync_error: null } : prev);
      } else {
        setSyncResult({ ok: false, message: body.error || 'Sync failed. Check your credentials.' });
      }
    } finally {
      setSyncing(false);
    }
  }

  const lastSynced = settings?.last_synced_at
    ? new Date(settings.last_synced_at).toLocaleString()
    : null;

  return (
    <section className="bg-white rounded-2xl border border-border p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">CalSync — Outlook Calendar</h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Connect your CalDAV credentials to sync Outlook meetings into this app.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            CalDAV Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. qz7h6ok7i1kpb-q"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-text-primary bg-board focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            CalDAV Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={settings ? 'Enter new password to update' : 'Your CalDAV password'}
              className="w-full rounded-xl border border-border px-4 py-2.5 pr-10 text-sm text-text-primary bg-board focus:outline-none focus:ring-2 focus:ring-primary/30"
              required={!settings}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {settings && (
            <p className="text-xs text-text-tertiary mt-1">Leave blank to keep existing password.</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Credentials'}
          </button>

          {settings && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-medium text-text-secondary hover:bg-surface disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          )}

          {savedAt && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </form>

      {syncResult && (
        <div className={cn(
          'flex items-start gap-2 rounded-xl px-4 py-3 text-sm',
          syncResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {syncResult.ok
            ? <Check className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {syncResult.message}
        </div>
      )}

      {(lastSynced || settings?.last_sync_error) && (
        <div className="border-t border-border pt-4 space-y-1">
          {lastSynced && (
            <p className="text-xs text-text-tertiary">Last synced: {lastSynced}</p>
          )}
          {settings?.last_sync_error && (
            <p className="text-xs text-red-500">Last error: {settings.last_sync_error}</p>
          )}
        </div>
      )}
    </section>
  );
}
