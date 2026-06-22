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
import { ChildSelector } from './components/ChildSelector';
import { ChildSwitcher } from './components/ChildSwitcher';
import { FamilyOverview } from './components/FamilyOverview';
import { ChildProfile, BehaviorLog, AIAnalysis } from './types';
import { getProfiles, getActiveProfile, setActiveChildId, getLogs, getLatestAnalysis, shouldRemindToLog, getLastReminderTime, setLastReminderTime } from './utils/storage';

type View = 'overview' | 'dashboard' | 'log' | 'history' | 'insights' | 'therapists' | 'settings';

export default function App() {
  const [profiles, setProfiles] = useState<ChildProfile[]>(() => getProfiles());
  const [profile, setProfile] = useState<ChildProfile | null>(() => getActiveProfile());
  const [logs, setLogs] = useState<BehaviorLog[]>(() => getLogs());
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(() => getLatestAnalysis());
  const [currentView, setCurrentView] = useState<View>('overview');
  const [hasReminder, setHasReminder] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);

  const refreshLogs = useCallback(() => {
    setLogs(getLogs());
  }, []);

  const selectChild = (id: string) => {
    setActiveChildId(id);
    setProfile(getActiveProfile());
    setLogs(getLogs());
    setAnalysis(getLatestAnalysis());
    setCurrentView('dashboard');
  };

  const handleChildAdded = (p: ChildProfile) => {
    setProfiles(getProfiles());
    setShowAddChild(false);
    selectChild(p.id);
  };

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

  if (profiles.length === 0) {
    return (
      <>
        <SetupProfile onComplete={p => { setProfiles([p]); selectChild(p.id); }} />
        <Analytics />
      </>
    );
  }

  if (showAddChild) {
    return (
      <>
        <SetupProfile onComplete={handleChildAdded} onCancel={() => setShowAddChild(false)} />
        <Analytics />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <ChildSelector profiles={profiles} onSelect={selectChild} onAddChild={() => setShowAddChild(true)} />
        <Analytics />
      </>
    );
  }

  const handleReset = () => {
    setProfiles([]);
    setProfile(null);
    setLogs([]);
    setAnalysis(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return (
          <FamilyOverview
            profiles={profiles}
            activeId={profile.id}
            onSelectChild={selectChild}
            onAddChild={() => setShowAddChild(true)}
          />
        );
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
            profiles={profiles}
            onProfileUpdated={p => { setProfile(p); setProfiles(getProfiles()); }}
            onSwitchChild={selectChild}
            onAddChild={() => setShowAddChild(true)}
            onChildDeleted={() => { setProfiles(getProfiles()); setProfile(getActiveProfile()); setLogs(getLogs()); setAnalysis(getLatestAnalysis()); }}
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
          {profiles.length > 1 && currentView !== 'overview' && (
            <ChildSwitcher
              profiles={profiles}
              activeId={profile.id}
              onSwitch={selectChild}
              onAddChild={() => setShowAddChild(true)}
            />
          )}
          {renderView()}
        </div>
      </main>
      <Analytics />
    </div>
  );
}
