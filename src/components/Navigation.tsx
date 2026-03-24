import { Home, PlusCircle, BarChart2, Brain, Search, Settings, type LucideIcon } from 'lucide-react';

type View = 'dashboard' | 'log' | 'history' | 'insights' | 'therapists' | 'settings';

interface Props {
  current: View;
  onChange: (v: View) => void;
  hasReminder: boolean;
}

const NAV_ITEMS: { id: View; icon: LucideIcon; label: string }[] = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'log', icon: PlusCircle, label: 'Log' },
  { id: 'history', icon: BarChart2, label: 'History' },
  { id: 'insights', icon: Brain, label: 'AI Insights' },
  { id: 'therapists', icon: Search, label: 'Therapists' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Navigation({ current, onChange, hasReminder }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 bg-white border-r border-slate-100 min-h-screen p-4 gap-1 fixed left-0 top-0">
        <div className="mb-6 px-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">A</div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">ADHD</p>
              <p className="text-xs text-slate-500 leading-tight">Behavior Tracker</p>
            </div>
          </div>
        </div>

        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              current === id
                ? 'bg-brand-50 text-brand-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon size={18} />
            {label}
            {id === 'log' && hasReminder && (
              <span className="absolute right-3 w-2 h-2 bg-amber-400 rounded-full animate-pulse-slow" />
            )}
          </button>
        ))}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50">
        <div className="flex">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium relative transition-colors ${
                current === id ? 'text-brand-600' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
              {id === 'log' && hasReminder && (
                <span className="absolute top-1 right-1/4 w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
