import React from 'react';
import { X, MessageSquare, Terminal, Users, UserCheck, AlertTriangle, Briefcase, Check } from 'lucide-react';
import type { CoachingMode } from '../types/database';

interface ModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: CoachingMode;
  onSelectMode: (mode: CoachingMode, domain?: string) => void;
  currentDomain?: string;
}

interface ModeCard {
  id: CoachingMode;
  title: string;
  tag: string;
  desc: string;
  icon: React.ReactNode;
  bgGlow: string;
}

const MODES: ModeCard[] = [
  {
    id: 'free_talk',
    title: 'Free Talk',
    tag: 'Spontaneous Speaking',
    desc: 'Casual English conversation to build natural phrasing, reduce hesitations, and eliminate awkward pauses.',
    icon: <MessageSquare className="w-5 h-5 text-cyan-400" />,
    bgGlow: 'hover:border-cyan-500/50 hover:bg-cyan-950/20',
  },
  {
    id: 'technical_interview',
    title: 'Technical Interview (Cybersecurity)',
    tag: 'Core Domain',
    desc: 'Rigorous campus interview practice: networking, Linux internals, SOC analysis, web security, and cryptosystems.',
    icon: <Terminal className="w-5 h-5 text-emerald-400" />,
    bgGlow: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
  },
  {
    id: 'hr_interview',
    title: 'HR & Behavioral Interview',
    tag: 'STAR Framework',
    desc: 'Practice responses to behavioral questions: leadership, handling college team conflicts, stress, and career goals.',
    icon: <UserCheck className="w-5 h-5 text-amber-400" />,
    bgGlow: 'hover:border-amber-500/50 hover:bg-amber-950/20',
  },
  {
    id: 'gd_simulator',
    title: 'Group Discussion Simulator',
    tag: 'Multi-Persona',
    desc: 'The coach simulates 2 active participants (Arjun & Priya). Jump in with counter-points, summarize, and assert your voice.',
    icon: <Users className="w-5 h-5 text-indigo-400" />,
    bgGlow: 'hover:border-indigo-500/50 hover:bg-indigo-950/20',
  },
  {
    id: 'incident_scenario',
    title: 'Incident / SOC Scenario',
    tag: 'High Pressure',
    desc: 'Simulate an active ransomware or credential stuffing breach. Communicate triage, containment, and root cause under pressure.',
    icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
    bgGlow: 'hover:border-rose-500/50 hover:bg-rose-950/20',
  },
  {
    id: 'explain_to_manager',
    title: 'Explain to a Manager',
    tag: 'Executive Fluency',
    desc: 'Translate complex technical CVEs or architecture flaws into plain business terms, ROI, downtime risk, and compliance.',
    icon: <Briefcase className="w-5 h-5 text-purple-400" />,
    bgGlow: 'hover:border-purple-500/50 hover:bg-purple-950/20',
  },
];

const DOMAINS = [
  'SOC & Incident Response (SIEM, EDR, Triage)',
  'Web App Security (OWASP Top 10, SQLi, XSS)',
  'Network Security & Firewalls (TCP/IP, TLS Handshake)',
  'Offensive Basics & Pentesting (Nmap, Metasploit)',
  'Cloud Security & IAM (AWS, Least Privilege, Zero Trust)',
  'Cryptography & Authentication (PKI, OAuth, Hash functions)',
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  currentDomain = 'SOC & Incident Response (SIEM, EDR, Triage)',
}) => {
  const [selectedMode, setSelectedMode] = React.useState<CoachingMode>(currentMode);
  const [selectedDomain, setSelectedDomain] = React.useState<string>(currentDomain);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectMode(selectedMode, selectedDomain);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white">Select Practice Mode</h2>
            <p className="text-xs text-slate-400">Choose a focused drill or mock scenario</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Modes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-md shadow-cyan-950/50'
                      : 'border-slate-800 bg-slate-950/40 ' + mode.bgGlow
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {mode.icon}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                        {mode.tag}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-1">{mode.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{mode.desc}</p>
                  </div>

                  {isSelected && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-cyan-400">
                      <Check className="w-4 h-4" />
                      <span>Selected Mode</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Technical Domain Picker (active for technical or scenario modes) */}
          {(selectedMode === 'technical_interview' || selectedMode === 'incident_scenario' || selectedMode === 'explain_to_manager') && (
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Cybersecurity Domain Focus
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setSelectedDomain(domain)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                      selectedDomain === domain
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200'
                        : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-lg shadow-md transition"
          >
            Start in Selected Mode
          </button>
        </div>
      </div>
    </div>
  );
};
