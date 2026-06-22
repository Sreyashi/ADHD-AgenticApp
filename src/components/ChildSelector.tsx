import { Plus, User } from 'lucide-react';
import { ChildProfile } from '../types';

interface Props {
  profiles: ChildProfile[];
  onSelect: (id: string) => void;
  onAddChild: () => void;
}

export function ChildSelector({ profiles, onSelect, onAddChild }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">My Children</h1>
          <p className="text-slate-500 mt-1">Choose a child to track, or add another.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="card text-left hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mb-3">
                <User size={18} className="text-brand-600" />
              </div>
              <p className="font-semibold text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-500">Age {p.age}</p>
            </button>
          ))}

          <button
            onClick={onAddChild}
            className="card text-left border-2 border-dashed border-slate-200 hover:border-brand-300 transition-all flex flex-col items-start justify-center"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Plus size={18} className="text-slate-500" />
            </div>
            <p className="font-semibold text-slate-600">Add Another Child</p>
          </button>
        </div>
      </div>
    </div>
  );
}
