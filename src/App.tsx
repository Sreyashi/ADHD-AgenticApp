import { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import { Navigation } from './components/Navigation';
import { SetupProfile } from './components/SetupProfile';
import { Dashboard } from './components/Dashboard';
import { BehaviorLogger } from './components/BehaviorLogger';
import { HistoryView } from './components/HistoryView';
import { AIInsights } from './components/AIInsights';
import { TherapistFinder } from './components/TherapistFinder';
import { Settings } from './components/Settings';
import { ChildProfile, BehaviorLog, AIAnalysis } from './types';
import { getProfile, getLogs, getLatestAnalysis, shouldRemindToLog, getLastReminderTime, setLastReminderTime } from './utils/storage';

type View = 'dashboard' | 'log' | 'history' | 'insights' | 'therapists' | 'settings';

export default function App() {
  const [profile, setProfile] = useState<ChildProfile | null>(() => getProfile());
  const [logs, setLogs] = useState<BehaviorLog[]>(() => getLogs());
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(() => getLatestAnalysis());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [hasReminder, setHasReminder] = useState(false);

  const refreshLogs = useCallback(() => {
    setLogs(getLogs());
  }, []);

  // Check reminder status
  useEffect(() => {
    const checkReminder = () => {
      const shouldRemind = shouldRemindToLog();
      const lastReminder = getLastReminderTime();
      const hoursSinceReminder = (Date.now() - lastReminder) / (1000 * 60 * 60);

      setHasReminder(shouldRemind);

      // Browser notification (once per 12h)
      if (
        shouldRemind &&
        hoursSinceReminder > 12 &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification('ADHD Tracker Reminder', {
            body: `Don't forget to log ${profile?.name ?? "your child"}'s behaviors today!`,
            icon: '/favicon.svg',
          });
        } catch {
          // Some mobile browsers (e.g. Chrome for Android, in-app WebViews) don't
          // support the Notification constructor outside a service worker context.
        }
        setLastReminderTime();
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 60 * 60 * 1000); // check hourly
    return () => clearInterval(interval);
  }, [profile]);

  // Track which page each user is on, so drop-off between pages is visible in analytics
  useEffect(() => {
    if (!profile) return;
    track('view_page', { page: currentView });
  }, [profile, currentView]);

  if (!profile) {
    return (
      <>
        <SetupProfile onComplete={p => { setProfile(p); setCurrentView('dashboard'); }} />
        <Analytics />
      </>
    );
  }

  const handleReset = () => {
    setProfile(null);
    setLogs([]);
    setAnalysis(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            profile={profile}
            logs={logs}
            analysis={analysis}
            onNavigate={v => setCurrentView(v)}
          />
        );
      case 'log':
        return (
          <BehaviorLogger
            onSaved={() => { refreshLogs(); setCurrentView('dashboard'); }}
          />
        );
      case 'history':
        return (
          <HistoryView
            logs={logs}
            profile={profile}
            onLogsChanged={refreshLogs}
          />
        );
      case 'insights':
        return (
          <AIInsights
            profile={profile}
            logs={logs}
            analysis={analysis}
            onAnalysisUpdated={a => setAnalysis(a)}
          />
        );
      case 'therapists':
        return <TherapistFinder profile={profile} />;
      case 'settings':
        return (
          <Settings
            profile={profile}
            onProfileUpdated={p => setProfile(p)}
            onReset={handleReset}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation current={currentView} onChange={setCurrentView} hasReminder={hasReminder} />

      {/* Content area */}
      <main className="md:ml-56 pb-24 md:pb-8 px-4 py-6 max-w-2xl mx-auto md:mx-0 md:max-w-none md:px-8">
        <div className="max-w-2xl">
          {renderView()}
        </div>
      </main>
      <Analytics />
    </div>
  );
}
