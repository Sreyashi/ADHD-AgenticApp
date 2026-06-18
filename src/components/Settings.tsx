import { useState } from 'react';
import { User, Trash2, Download, Bell, AlertCircle } from 'lucide-react';
import { ChildProfile } from '../types';
import { saveProfile, getLogs, exportLogsAsText } from '../utils/storage';

interface Props {
  profile: ChildProfile;
  onProfileUpdated: (p: ChildProfile) => void;
  onReset: () => void;
}

export function Settings({ profile, onProfileUpdated, onReset }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [showReset, setShowReset] = useState(false);
  const notifSupported = typeof Notification !== 'undefined';
  const [notifGranted, setNotifGranted] = useState(notifSupported && Notification.permission === 'granted');

  const DIAGNOSES = ['ADHD - Inattentive', 'ADHD - Hyperactive', 'ADHD - Combined', 'ASD', 'Anxiety', 'ODD', 'Sensory Processing Disorder'];

  const toggleDiagnosis = (d: string) => {
    setForm(f => ({
      ...f,
      diagnosis: f.diagnosis.includes(d) ? f.diagnosis.filter(x => x !== d) : [...f.diagnosis, d]
    }));
  };

  const handleSave = () => {
    saveProfile(form);
    onProfileUpdated(form);
    setEditing(false);
  };

  const handleExport = () => {
    const logs = getLogs();
    const text = exportLogsAsText(logs, profile);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name}-behavior-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const requestNotifications = async () => {
    if (!notifSupported) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifGranted(true);
      try {
        new Notification('ADHD Tracker', { body: `Notifications enabled! We'll remind you to log ${profile.name}'s behaviors.` });
      } catch {
        // Some mobile browsers (e.g. Chrome for Android, in-app WebViews) don't
        // support the Notification constructor outside a service worker context.
      }
    }
  };

  const handleReset = () => {
    localStorage.clear();
    onReset();
  };

  const f = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        className="input-field text-sm"
        placeholder={placeholder}
        value={form[key] as string}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-800">Settings</h2>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{profile.name}</p>
              <p className="text-xs text-slate-500">Age {profile.age} · {profile.diagnosis.join(', ') || 'No diagnosis set'}</p>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="btn-ghost text-sm">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {f("Child's Name", 'name')}
            {f("Age", 'age', 'number')}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Diagnosis</label>
              <div className="flex flex-wrap gap-2">
                {DIAGNOSES.map(d => (
                  <button
                    key={d}
                    onClick={() => toggleDiagnosis(d)}
                    className={`tag-trigger text-xs ${form.diagnosis.includes(d) ? 'selected' : ''}`}
                  >{d}</button>
                ))}
              </div>
            </div>

            {f("Location", 'location', 'text', 'City, State')}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Therapist Info</p>
              {f("Therapist Name", 'currentTherapist')}
              {f("Therapist Phone", 'therapistPhone', 'tel')}
              {f("Therapist Email", 'therapistEmail', 'email')}
              {f("Therapy Start Date", 'therapyStartDate', 'date')}
            </div>

            {f("Medications", 'medications', 'text', 'Current medications')}

            <button onClick={handleSave} className="btn-primary w-full mt-2">Save Changes</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-3">
            {[
              { label: 'Location', value: profile.location || '—' },
              { label: 'Therapist', value: profile.currentTherapist || '—' },
              { label: 'Phone', value: profile.therapistPhone || '—' },
              { label: 'Therapy since', value: profile.therapyStartDate || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-slate-700 font-medium truncate">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <Bell size={18} className="text-brand-500" />
          <h3 className="font-semibold text-slate-800">Reminders</h3>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          Enable browser notifications to be reminded to log {profile.name}'s behaviors daily.
        </p>
        {notifGranted ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <Bell size={16} />
            Notifications enabled
          </div>
        ) : notifSupported ? (
          <button onClick={requestNotifications} className="btn-primary text-sm py-2">
            Enable Notifications
          </button>
        ) : (
          <p className="text-xs text-slate-400">Notifications aren't supported in this browser.</p>
        )}
      </div>

      {/* Export */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <Download size={18} className="text-brand-500" />
          <h3 className="font-semibold text-slate-800">Export Data</h3>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          Download all behavior logs as a text file to share with {profile.name}'s therapist.
        </p>
        <button onClick={handleExport} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
          <Download size={15} />
          Download Report (.txt)
        </button>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 size={18} className="text-red-500" />
          <h3 className="font-semibold text-red-700">Reset App</h3>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          This will permanently delete all logs, profile, and analysis data. This cannot be undone.
        </p>
        {showReset ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <AlertCircle size={16} />
              Are you sure? All data will be lost.
            </div>
            <div className="flex gap-2">
              <button onClick={handleReset} className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-xl hover:bg-red-600 transition-colors text-sm">
                Yes, Delete Everything
              </button>
              <button onClick={() => setShowReset(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowReset(true)} className="text-red-500 border border-red-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors">
            Reset All Data
          </button>
        )}
      </div>

      {/* App info */}
      <div className="text-center text-xs text-slate-400 py-2 space-y-1">
        <p>ADHD Behavior Tracker v1.0.0</p>
        <p>Built with ♥ to support ADHD families</p>
        <p>All data stored locally on your device</p>
      </div>
    </div>
  );
}
