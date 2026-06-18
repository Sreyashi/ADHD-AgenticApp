import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { ChildProfile } from '../types';
import { saveProfile } from '../utils/storage';

interface Props {
  onComplete: (profile: ChildProfile) => void;
}

export function SetupProfile({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    age: '',
    diagnosis: [] as string[],
    currentTherapist: '',
    therapistPhone: '',
    therapistEmail: '',
    therapyStartDate: '',
    location: '',
    medications: '',
    notes: '',
  });

  const DIAGNOSES = ['ADHD - Inattentive', 'ADHD - Hyperactive', 'ADHD - Combined', 'ASD', 'Anxiety', 'ODD', 'Sensory Processing Disorder'];

  const toggleDiagnosis = (d: string) => {
    setForm(f => ({
      ...f,
      diagnosis: f.diagnosis.includes(d) ? f.diagnosis.filter(x => x !== d) : [...f.diagnosis, d]
    }));
  };

  const handleSubmit = () => {
    const profile: ChildProfile = {
      id: uuid(),
      name: form.name,
      age: parseInt(form.age),
      diagnosis: form.diagnosis,
      currentTherapist: form.currentTherapist,
      therapistPhone: form.therapistPhone,
      therapistEmail: form.therapistEmail,
      therapyStartDate: form.therapyStartDate,
      location: form.location,
      medications: form.medications,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };
    saveProfile(profile);
    onComplete(profile);
  };

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ADHD Behavior Tracker</h1>
          <p className="text-slate-500 mt-1">AI-powered daily tracking for parents & therapists</p>
          <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2 mt-4 inline-block">
            We do not store the confidential data. The data is stored at user browser level.
          </p>
        </div>

        <div className="card shadow-md animate-fade-in">
          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Child Information</h2>
              {field("Child's Name", 'name', 'text', "e.g. Alex")}
              {field("Age", 'age', 'number', "e.g. 8")}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Diagnosis (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {DIAGNOSES.map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDiagnosis(d)}
                      className={`tag-trigger ${form.diagnosis.includes(d) ? 'selected' : ''}`}
                    >{d}</button>
                  ))}
                </div>
              </div>
              {field("Your Location", 'location', 'text', "City, State (for therapist search)")}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Current Therapist</h2>
              <p className="text-sm text-slate-500">This helps us generate reports and track therapy progress.</p>
              {field("Therapist's Name", 'currentTherapist', 'text', "e.g. Dr. Sarah Johnson")}
              {field("Phone Number", 'therapistPhone', 'tel', "e.g. (555) 123-4567")}
              {field("Email", 'therapistEmail', 'email', "therapist@example.com")}
              {field("Therapy Start Date", 'therapyStartDate', 'date')}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Additional Details</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Medications (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Ritalin 10mg, Melatonin"
                  value={form.medications}
                  onChange={e => setForm(f => ({ ...f, medications: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Notes (optional)</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Any important context about your child..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="bg-brand-50 rounded-xl p-4">
                <p className="text-sm text-brand-700 font-medium">✓ All data stays on your device</p>
                <p className="text-xs text-brand-600 mt-1">Your data is stored locally. AI features use secure API calls without storing personal data.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button className="btn-secondary flex-1" onClick={() => setStep(s => s - 1)}>Back</button>
            )}
            {step < 3 ? (
              <button
                className="btn-primary flex-1"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !form.name}
              >
                Continue
              </button>
            ) : (
              <button
                className="btn-primary flex-1"
                onClick={handleSubmit}
                disabled={!form.name}
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
