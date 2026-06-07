import { CalSyncSettings } from './CalSyncSettings';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-tertiary mt-1">Manage your account and integrations</p>
      </div>

      <CalSyncSettings />
    </div>
  );
}
