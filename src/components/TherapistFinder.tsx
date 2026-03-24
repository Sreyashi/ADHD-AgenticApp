import { useState } from 'react';
import { Search, Phone, MapPin, Globe, CheckCircle, Video, AlertCircle, ExternalLink } from 'lucide-react';
import { ChildProfile, TherapistResult } from '../types';

interface Props {
  profile: ChildProfile;
}

export function TherapistFinder({ profile }: Props) {
  const [location, setLocation] = useState(profile.location || '');
  const [specialtyFocus, setSpecialtyFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [therapists, setTherapists] = useState<TherapistResult[]>([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [disclaimer, setDisclaimer] = useState('');

  const handleSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location to search.');
      return;
    }
    setLoading(true);
    setError('');
    setTherapists([]);
    setSearched(false);

    try {
      const resp = await fetch('/api/therapist-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          childAge: profile.age,
          diagnosis: profile.diagnosis,
          specialtyFocus,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${resp.status}`);
      }

      const data = await resp.json();
      setTherapists(data.therapists || []);
      setDisclaimer(data.disclaimer || '');
      setSearched(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg.includes('Failed to fetch')
        ? 'Cannot connect to search service. Make sure ANTHROPIC_API_KEY is set in Vercel environment variables.'
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Find a Therapist</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          AI-powered search to find ADHD specialists near you
        </p>
      </div>

      {/* Search form */}
      <div className="card space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Location</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="City, State (e.g. Austin, TX)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Specific needs <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. CBT, sensory integration, telehealth, bilingual..."
            value={specialtyFocus}
            onChange={e => setSpecialtyFocus(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="bg-slate-100 px-2 py-1 rounded-lg">Age: {profile.age} years</span>
          {profile.diagnosis.slice(0, 2).map(d => (
            <span key={d} className="bg-brand-50 text-brand-600 px-2 py-1 rounded-lg">{d}</span>
          ))}
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !location.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Search size={16} className={loading ? 'animate-pulse' : ''} />
          {loading ? 'Searching for therapists...' : 'Search Therapists'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping" />
            <div className="relative w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
              <Search size={28} className="text-brand-500" />
            </div>
          </div>
          <p className="font-medium text-slate-700">Searching for ADHD specialists...</p>
          <p className="text-sm text-slate-400 mt-1">Finding therapists near {location}</p>
        </div>
      )}

      {/* Disclaimer */}
      {disclaimer && searched && (
        <div className="card border-amber-200 bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">{disclaimer}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && therapists.length === 0 && !loading && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-medium text-slate-600">No results found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different location or broader search terms</p>
        </div>
      )}

      {therapists.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3">
            {therapists.length} Therapist{therapists.length !== 1 ? 's' : ''} Found Near {location}
          </h3>
          <div className="space-y-4">
            {therapists.map((t, i) => (
              <div key={t.id || i} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800">{t.name}</h4>
                      {t.credentials && (
                        <span className="text-xs bg-brand-50 text-brand-600 border border-brand-100 px-2 py-0.5 rounded-lg font-medium">
                          {t.credentials}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{t.specialty}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {t.acceptingNewPatients && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle size={12} />
                        Accepting
                      </span>
                    )}
                    {t.telehealth && (
                      <span className="flex items-center gap-1 text-xs text-brand-600 font-medium">
                        <Video size={12} />
                        Telehealth
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{t.address}, {t.city}, {t.state}</span>
                  </div>

                  {t.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-slate-400 flex-shrink-0" />
                      <a href={`tel:${t.phone.replace(/\D/g, '')}`} className="text-brand-600 font-medium hover:underline">
                        {t.phone}
                      </a>
                    </div>
                  )}

                  {t.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe size={14} className="text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${t.email}`} className="text-brand-600 hover:underline truncate">
                        {t.email}
                      </a>
                    </div>
                  )}
                </div>

                {t.approaches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.approaches.map(a => (
                      <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {t.notes && <p className="text-xs text-slate-500 mt-2 italic">{t.notes}</p>}

                {t.directoryLink && (
                  <a
                    href={t.directoryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:underline"
                  >
                    View profile <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory links */}
      <div className="card bg-slate-50">
        <p className="text-sm font-semibold text-slate-700 mb-3">Find more therapists in these directories</p>
        <div className="space-y-2">
          {[
            { name: 'Psychology Today', desc: 'Largest therapist directory', url: 'https://www.psychologytoday.com/us/therapists' },
            { name: 'CHADD Therapist Finder', desc: 'ADHD-specific directory', url: 'https://chadd.org/professional-directory/' },
            { name: 'TherapyDen', desc: 'Inclusive therapist search', url: 'https://www.therapyden.com' },
            { name: 'Zocdoc', desc: 'Book appointments online', url: 'https://www.zocdoc.com' },
          ].map(({ name, desc, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-200 hover:shadow-sm transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-brand-600 transition-colors">{name}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <ExternalLink size={14} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
