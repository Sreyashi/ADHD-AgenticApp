import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { ChildProfile } from '../types';

interface Props {
  profiles: ChildProfile[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAddChild: () => void;
}

export function ChildSwitcher({ profiles, activeId, onSwitch, onAddChild }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = profiles.find(p => p.id === activeId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!active) return null;

  return (
    <div className="relative mb-4" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 transition-colors"
      >
        Tracking <span className="text-brand-600 font-semibold">{active.name}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 animate-fade-in">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => { onSwitch(p.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>{p.name} <span className="text-slate-400">· Age {p.age}</span></span>
              {p.id === activeId && <Check size={14} className="text-brand-600" />}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => { onAddChild(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 font-medium hover:bg-slate-50"
            >
              <Plus size={14} />
              Add Another Child
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
