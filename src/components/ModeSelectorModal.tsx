import React from 'react';
import { X, Check, Shield, Users, AlertTriangle, Briefcase, Zap, RotateCcw, Volume2, Award } from 'lucide-react';
import { CoachingMode, TechnicalDomain } from '../types/database';

interface ModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: CoachingMode;
  technicalDomain: TechnicalDomain;
  onSelectMode: (mode: CoachingMode, domain?: TechnicalDomain) => void;
}

interface ModeCard {
  mode: CoachingMode;
  title: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  hasDomainPicker?: boolean;
}

const DOMAINS: Array<{ id: TechnicalDomain; label: string; desc: string }> = [
  { id: 'fundamentals', label: 'Security Fundamentals', desc: 'CIA triad, crypto, auth vs authz' },
  { id: 'networking', label: 'Network Security', desc: 'TCP/IP, Wireshark, firewalls, TLS' },
  { id: 'web_security', label: 'Web Security & OWASP', desc: 'SQLi, XSS, CSRF, SSRF, IDOR' },
  { id: 'soc_ir', label: 'SOC & Incident Response', desc: 'SIEM alerts, triage, malware containment' },
  { id: 'offensive_basics', label: 'Offensive Basics', desc: 'Recon, port scanning, privilege escalation' },
  { id: 'cloud_iam', label: 'Cloud Security & IAM', desc: 'AWS/Azure roles, S3 misconfigs, least privilege' },
  { id: 'grc', label: 'GRC & Risk Management', desc: 'NIST CSF, ISO 27001, compliance, audit' },
];

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  technicalDomain,
  onSelectMode,
}) => {
  const [selectedMode, setSelectedMode] = React.useState<CoachingMode>(currentMode);
  const [selectedDomain, setSelectedDomain] = React.useState<TechnicalDomain>(technicalDomain);

  if (!isOpen) return null;

  const MODES: ModeCard[] = [
    {
      mode: 'free_talk',
      title: 'Free Talk & Fluency Flow',
      badge: 'Low Stress',
      desc: 'Casual spoken English about college, projects, current cyber news, and tech interests.',
      icon: <Volume2 className="h-5 w-5 text-blue-400" />,
      accent: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    },
    {
      mode: 'hr_interview',
      title: 'HR & Behavioral Round',
      badge: 'STAR Method',
      desc: 'Tell me about yourself, behavioral scenarios, conflict resolution, career aspirations.',
      icon: <Briefcase className="h-5 w-5 text-purple-400" />,
      accent: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
    {
      mode: 'technical_interview',
      title: 'Technical Interview',
      badge: 'Domain Specific',
      desc: 'Principal engineer questioning your cybersecurity fundamentals, architecture, and investigative logic.',
      icon: <Shield className="h-5 w-5 text-emerald-400" />,
      accent: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
      hasDomainPicker: true,
    },
    {
      mode: 'gd_simulator',
      title: 'Group Discussion (GD) Simulator',
      badge: 'Multi-Participant',
      desc: 'Coach simulates 2 aggressive/thoughtful participants. Practice stepping in, summarizing, and presenting arguments.',
      icon: <Users className="h-5 w-5 text-amber-400" />,
      accent: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
    {
      mode: 'incident_scenario',
      title: 'Incident Response / Crisis Room',
      badge: 'High Pressure',
      desc: 'Active security breach scenario. Report status quickly, recommend containment steps with composure.',
      icon: <AlertTriangle className="h-5 w-5 text-rose-400" />,
      accent: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    },
    {
      mode: 'explain_to_manager',
      title: 'Explain to a Non-Technical Manager',
      badge: 'Executive Presence',
      desc: 'Coach acts as a non-technical COO. Translate CVEs and zero-days into business risk without jargon.',
      icon: <Users className="h-5 w-5 text-cyan-400" />,
      accent: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    },
    {
      mode: 'full_mock_interview',
      title: 'Full Mock Interview',
      badge: 'Timed Simulation',
      desc: 'Full 20-30 min exam format without in-flight coaching. Structured evaluation card delivered at the end.',
      icon: <Award className="h-5 w-5 text-yellow-400" />,
      accent: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    },
    {
      mode: 'rapid_fire',
      title: 'Rapid Fire Round',
      badge: '30s Answers',
      desc: 'Brisk cadence. Concise definitions and fast recall to eliminate hesitations and "ums".',
      icon: <Zap className="h-5 w-5 text-fuchsia-400" />,
      accent: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-400',
    },
    {
      mode: 'redo_drill',
      title: 'Redo Weakest Answer Drill',
      badge: 'Targeted Mastery',
      desc: 'Re-evaluates past answers flagged for excessive fillers or poor structure until mastered.',
      icon: <RotateCcw className="h-5 w-5 text-teal-400" />,
      accent: 'border-teal-500/40 bg-teal-500/10 text-teal-400',
    },
  ];

  const handleApply = () => {
    onSelectMode(selectedMode, selectedDomain);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Select Coaching Mode</h2>
            <p className="text-xs text-zinc-400">
              Each mode adjusts the coach's behavior, technical depth, persona, and evaluation criteria.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODES.map((item) => {
              const isSelected = selectedMode === item.mode;
              return (
                <div
                  key={item.mode}
                  onClick={() => setSelectedMode(item.mode)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-950/40'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-zinc-900 p-2 border border-zinc-800">
                          {item.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.accent}`}>
                            {item.badge}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-zinc-950">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technical Domain Picker (Shown if Technical Interview is selected) */}
          {selectedMode === 'technical_interview' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400">Cybersecurity Focus Domain</h4>
                  <p className="text-xs text-zinc-400">Tailors questions to specific cybersecurity sub-disciplines.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DOMAINS.map((domain) => (
                  <button
                    key={domain.id}
                    onClick={() => setSelectedDomain(domain.id)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      selectedDomain === domain.id
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <div className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                      selectedDomain === domain.id ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-700'
                    }`}>
                      {selectedDomain === domain.id && <div className="h-1.5 w-1.5 rounded-full bg-zinc-950" />}
                    </div>
                    <div>
                      <div className="font-medium text-white">{domain.label}</div>
                      <div className="text-[11px] text-zinc-400">{domain.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <span>Apply Coaching Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
