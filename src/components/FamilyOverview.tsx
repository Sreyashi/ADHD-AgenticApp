import { format } from 'date-fns';
import { User, Plus, FileText, Brain, Bell, ChevronRight } from 'lucide-react';
import { ChildProfile } from '../types';
import { getLogCountForChild, getLastLogDateForChild, getAnalysisForChild } from '../utils/storage';

interface Props {
  profiles: ChildProfile[];
  activeId: string;
  onSelectChild: (id: string) => void;
  onAddChild: () => void;
}

export function FamilyOverview({ profiles, activeId, onSelectChild, onAddChild }: Props) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">My Children</h2>
          <p className="text-sm text-slate-500">{profiles.length} child{profiles.length !== 1 ? 'ren' : ''} tracked</p>
        </div>
        <button onClick={onAddChild} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Plus size={15} />
          Add Child
        </button>
      </div>

      <div className="space-y-3">
        {profiles.map(p => {
          const logCount = getLogCountForChild(p.id);
          const lastLogDate = getLastLogDateForChild(p.id);
          const analysis = getAnalysisForChild(p.id);
          const pendingFollowUps = analysis?.reminders.length ?? 0;

          return (
            <button
              key={p.id}
              onClick={() => onSelectChild(p.id)}
              className={`card w-full text-left hover:shadow-md transition-all ${p.id === activeId ? 'border-brand-300' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Age {p.age}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Logs</p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <FileText size={13} className="text-slate-400" />
                    {logCount}
                  </p>
                  {lastLogDate && (
                    <p className="text-xs text-slate-400 mt-0.5">Last {format(lastLogDate, 'MMM d')}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Last AI Insight</p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Brain size={13} className="text-slate-400" />
                    {analysis ? format(new Date(analysis.generatedAt), 'MMM d') : 'None yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Follow-ups</p>
                  <p className={`text-sm font-semibold flex items-center gap-1 mt-0.5 ${pendingFollowUps > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                    <Bell size={13} className={pendingFollowUps > 0 ? 'text-amber-500' : 'text-slate-400'} />
                    {pendingFollowUps > 0 ? `${pendingFollowUps} pending` : 'None'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        <button
          onClick={onAddChild}
          className="card w-full text-left border-2 border-dashed border-slate-200 hover:border-brand-300 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <Plus size={18} className="text-slate-500" />
          </div>
          <p className="font-semibold text-slate-600">Add Another Child</p>
        </button>
      </div>
    </div>
  );
}
