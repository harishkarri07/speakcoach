import React, { useState, useEffect } from 'react';
import { X, User, Mail, GraduationCap, Shield, Target, Sliders, Check, Sparkles, Volume2 } from 'lucide-react';
import type { Profile } from '../types/database';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaveProfile: (updatedProfile: Partial<Profile>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [collegeYear, setCollegeYear] = useState(profile?.college_year || '3rd Year B.Tech');
  const [domainFocus, setDomainFocus] = useState(profile?.domain_focus || 'Cybersecurity & SOC Operations');
  const [targetRole, setTargetRole] = useState(profile?.target_role || 'Associate Security Analyst');
  const [coachTone, setCoachTone] = useState<'supportive' | 'strict' | 'realistic' | 'executive'>(
    profile?.coach_tone || 'realistic'
  );
  const [pacingPreference, setPacingPreference] = useState<'normal' | 'deliberate' | 'rapid'>(
    profile?.pacing_preference || 'normal'
  );
  const [fillerStrictness, setFillerStrictness] = useState<'relaxed' | 'balanced' | 'strict'>(
    profile?.filler_strictness || 'balanced'
  );

  const [activeTab, setActiveTab] = useState<'profile' | 'coaching'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName(profile?.full_name || '');
      setEmail(profile?.email || '');
      setCollegeYear(profile?.college_year || '3rd Year B.Tech');
      setDomainFocus(profile?.domain_focus || 'Cybersecurity & SOC Operations');
      setTargetRole(profile?.target_role || 'Associate Security Analyst');
      setCoachTone(profile?.coach_tone || 'realistic');
      setPacingPreference(profile?.pacing_preference || 'normal');
      setFillerStrictness(profile?.filler_strictness || 'balanced');
      setSaveSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        college_year: collegeYear,
        domain_focus: domainFocus,
        target_role: targetRole.trim(),
        coach_tone: coachTone,
        pacing_preference: pacingPreference,
        filler_strictness: fillerStrictness,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const QUICK_ROLES = [
    'Associate Security Analyst',
    'SOC Tier-1 Analyst',
    'Junior Penetration Tester',
    'Cloud Security Intern',
    'Incident Response Trainee',
    'AppSec Junior Engineer',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Profile & Practice Settings</h2>
              <p className="text-xs text-zinc-400">Customize your student identity, goals, and AI coaching style</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/60 mt-3">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Student Identity & Target Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coaching')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'coaching'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Coach Persona & Speech Settings
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {activeTab === 'profile' ? (
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name (e.g., Harish K.)"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  This name is used by your coach during interviews, GD simulations, and feedback cards.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@university.edu"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* College / Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Academic Year / Stage
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <select
                      value={collegeYear}
                      onChange={(e) => setCollegeYear(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="1st Year B.Tech / Undergrad">1st Year Undergrad</option>
                      <option value="2nd Year B.Tech / Undergrad">2nd Year Undergrad</option>
                      <option value="3rd Year B.Tech">3rd Year B.Tech (Placement Prep)</option>
                      <option value="4th Year / Final Year">Final Year (Campus Hiring)</option>
                      <option value="Master's / Postgraduate">Master's / Postgraduate</option>
                      <option value="Recent Graduate">Recent Graduate</option>
                      <option value="Self-Taught / Career Switcher">Self-Taught / Career Switcher</option>
                    </select>
                  </div>
                </div>

                {/* Domain Focus */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Technical Domain Focus
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <select
                      value={domainFocus}
                      onChange={(e) => setDomainFocus(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="Cybersecurity & SOC Operations">SOC Operations & IR</option>
                      <option value="Application Security & Pentesting">AppSec & Penetration Testing</option>
                      <option value="Cloud Security & DevSecOps">Cloud Security & DevSecOps</option>
                      <option value="Network Security & Defense">Network Security & Defense</option>
                      <option value="Identity & Access Management (IAM)">Identity & Access Management (IAM)</option>
                      <option value="Governance, Risk & Compliance (GRC)">Governance, Risk & Compliance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Target Role */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Target Job Role
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Associate Security Analyst"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                {/* Quick Role Suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTargetRole(role)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        targetRole === role
                          ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Coach Tone */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Interviewer Persona & Tone
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'realistic',
                      title: 'Realistic Interviewer',
                      desc: 'Authentic technical and hiring manager style with industry expectations.',
                    },
                    {
                      id: 'supportive',
                      title: 'Supportive Mentor',
                      desc: 'Encouraging, constructive, focuses on confidence building and hints.',
                    },
                    {
                      id: 'strict',
                      title: 'Strict Stress-Test',
                      desc: 'Direct, challenges technical depth, probes edge cases under pressure.',
                    },
                    {
                      id: 'executive',
                      title: 'Executive / Managerial',
                      desc: 'Strictly penalizes jargon; tests your ability to explain concepts to leadership.',
                    },
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setCoachTone(t.id as any)}
                      className={`cursor-pointer p-3 rounded-xl border transition ${
                        coachTone === t.id
                          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-xs text-white">
                        <span>{t.title}</span>
                        {coachTone === t.id && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400 leading-snug">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speech Target Pacing */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Target Speaking Rate (Words Per Minute)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'deliberate', label: 'Deliberate', wpm: '100-120 WPM' },
                    { id: 'normal', label: 'Balanced (Standard)', wpm: '120-140 WPM' },
                    { id: 'rapid', label: 'Dynamic Pace', wpm: '140-160 WPM' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPacingPreference(p.id as any)}
                      className={`p-2.5 text-center rounded-xl border text-xs transition ${
                        pacingPreference === p.id
                          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{p.wpm}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filler Word Strictness */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Filler Word Sensitivity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'relaxed', label: 'Relaxed', desc: 'Focus on ideas' },
                    { id: 'balanced', label: 'Balanced', desc: 'Flag 3+ repeats' },
                    { id: 'strict', label: 'Zero Tolerance', desc: 'Flag every filler' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFillerStrictness(s.id as any)}
                      className={`p-2.5 text-center rounded-xl border text-xs transition ${
                        fillerStrictness === s.id
                          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>{s.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">
              {saveSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="h-3.5 w-3.5" /> Profile updated successfully!
                </span>
              ) : (
                'Changes apply immediately to upcoming drills.'
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-800 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
