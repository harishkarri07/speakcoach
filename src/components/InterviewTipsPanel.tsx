import React, { useState } from 'react';
import { 
  Lightbulb, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle, 
  BookOpen, 
  Zap, 
  Copy, 
  Check, 
  Search, 
  X, 
  ArrowUpRight,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { TechnicalDomain } from '../types/database';
import { DOMAIN_INTERVIEW_TIPS, DomainInterviewTip } from '../data/interviewTips';

interface InterviewTipsPanelProps {
  currentDomain: TechnicalDomain;
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (promptText: string) => void;
  onDomainChange?: (domain: TechnicalDomain) => void;
}

export const InterviewTipsPanel: React.FC<InterviewTipsPanelProps> = ({
  currentDomain,
  isOpen,
  onClose,
  onSelectPrompt,
  onDomainChange,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<TechnicalDomain>(currentDomain);
  const [activeTab, setActiveTab] = useState<'questions' | 'frameworks' | 'buzzwords' | 'redflags'>('questions');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync with currentDomain if it changes externally
  React.useEffect(() => {
    setSelectedDomain(currentDomain);
  }, [currentDomain]);

  if (!isOpen) return null;

  const tipData: DomainInterviewTip = DOMAIN_INTERVIEW_TIPS[selectedDomain] || DOMAIN_INTERVIEW_TIPS.soc_ir;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const handleDomainSelect = (d: TechnicalDomain) => {
    setSelectedDomain(d);
    if (onDomainChange) {
      onDomainChange(d);
    }
  };

  // Filter questions by search query
  const filteredQuestions = tipData.highYieldQuestions.filter(
    (q) => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.keyPoints.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.whatInterviewersLookFor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBuzzwords = tipData.powerTerminology.filter(
    (b) =>
      b.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.exampleUsage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRedFlags = tipData.redFlagsToAvoid.filter(
    (r) =>
      r.blunder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fix.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DOMAIN_OPTIONS: { id: TechnicalDomain; label: string }[] = [
    { id: 'soc_ir', label: 'SOC / Incident Response' },
    { id: 'web_security', label: 'Web Security & AppSec' },
    { id: 'networking', label: 'Network Security & Protocols' },
    { id: 'cloud_iam', label: 'Cloud Security & IAM' },
    { id: 'offensive_basics', label: 'Pentesting & Red Teaming' },
    { id: 'grc', label: 'GRC & Risk Management' },
    { id: 'cybersecurity_fundamentals', label: 'Cybersecurity Fundamentals' },
  ];

  return (
    <aside 
      className="flex h-full w-full flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden transition-all duration-300 sm:w-96 md:w-[420px]"
      aria-label="Real-time Interview Tips"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Interview Tips</h2>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Live Domain Cues
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">
              {tipData.title}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Close tips panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Domain Quick Switcher Dropdown */}
      <div className="border-b border-zinc-800/60 bg-zinc-950/90 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-400 shrink-0 flex items-center gap-1">
            <Shield className="h-3 w-3 text-cyan-400" />
            Active Domain:
          </span>
          <select
            value={selectedDomain}
            onChange={(e) => handleDomainSelect(e.target.value as TechnicalDomain)}
            className="w-full text-xs font-semibold rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-cyan-300 focus:border-cyan-500 focus:outline-none"
          >
            {DOMAIN_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delivery Formula Banner */}
      <div className="border-b border-zinc-800/60 bg-gradient-to-r from-blue-950/40 via-zinc-900/50 to-cyan-950/30 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs font-semibold text-cyan-200">
              {tipData.deliveryFormulas.name}
            </span>
            <div className="mt-1 space-y-0.5">
              {tipData.deliveryFormulas.steps.map((step, idx) => (
                <div key={idx} className="text-[11px] text-zinc-300 leading-snug">
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, EVTX, attacks, terms..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-zinc-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-zinc-800/80 px-2 mt-1">
        {[
          { id: 'questions', label: 'Questions & Answers', icon: BookOpen },
          { id: 'frameworks', label: 'Frameworks', icon: Layers },
          { id: 'buzzwords', label: 'Power Terms', icon: Zap },
          { id: 'redflags', label: 'Red Flags', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Tab 1: High Yield Questions */}
        {activeTab === 'questions' && (
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No matching questions found for "{searchQuery}".
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const isExpanded = expandedQuestion === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden transition-all hover:border-zinc-700/80"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                      className="w-full flex items-start justify-between gap-2 p-3 text-left hover:bg-zinc-850/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-zinc-100 leading-snug">
                          {q.question}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-3 space-y-2.5 text-xs animate-in fade-in duration-150">
                        {/* Key Talking Points */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            Must-Hit Talking Points
                          </span>
                          <ul className="mt-1 space-y-1">
                            {q.keyPoints.map((pt, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-1.5 text-zinc-300 text-[11px] leading-relaxed">
                                <span className="text-cyan-400 font-bold">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Interviewer Evaluation Goal */}
                        <div className="rounded-lg bg-zinc-900/90 p-2 border border-zinc-800 text-[11px]">
                          <span className="font-semibold text-amber-300">What they look for: </span>
                          <span className="text-zinc-400">{q.whatInterviewersLookFor}</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(q.keyPoints.join('\n'), `pts_${idx}`)}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                          >
                            {copiedText === `pts_${idx}` ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Answer Plan</span>
                              </>
                            )}
                          </button>

                          {onSelectPrompt && (
                            <button
                              type="button"
                              onClick={() => onSelectPrompt(q.practicePrompt)}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-950 border border-cyan-800/60 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900 transition-colors"
                              title="Ask this question to your coach right now"
                            >
                              <span>Practice With Coach</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Core Frameworks */}
        {activeTab === 'frameworks' && (
          <div className="space-y-3">
            {tipData.coreFrameworks.map((fw, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    {fw.name}
                  </span>
                  <button
                    onClick={() => handleCopy(fw.name, `fw_${idx}`)}
                    className="text-zinc-500 hover:text-zinc-300"
                    title="Copy framework name"
                  >
                    {copiedText === `fw_${idx}` ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {fw.description}
                </p>
                <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-2 text-[10px] text-zinc-400">
                  <strong className="text-cyan-400 font-semibold">When to cite in interview: </strong>
                  {fw.whenToQuote}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Power Terminology */}
        {activeTab === 'buzzwords' && (
          <div className="space-y-3">
            {filteredBuzzwords.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No matching terminology found.
              </div>
            ) : (
              filteredBuzzwords.map((bw, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-amber-400" />
                      {bw.term}
                    </span>
                    <button
                      onClick={() => handleCopy(`"${bw.exampleUsage}"`, `bw_${idx}`)}
                      className="text-zinc-500 hover:text-zinc-300"
                      title="Copy example sentence"
                    >
                      {copiedText === `bw_${idx}` ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    {bw.definition}
                  </p>
                  <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-2 text-[10px] italic text-zinc-400">
                    <span className="text-amber-400 font-semibold not-italic">Sample Sentence: </span>
                    {bw.exampleUsage}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Red Flags & Blunders */}
        {activeTab === 'redflags' && (
          <div className="space-y-3">
            {filteredRedFlags.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No matching red flags found.
              </div>
            ) : (
              filteredRedFlags.map((rf, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-rose-950/60 bg-rose-950/20 p-3 space-y-2 border-l-2 border-l-rose-500"
                >
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        Interview Blunder:
                      </span>
                      <p className="text-xs font-semibold text-zinc-200 mt-0.5 leading-snug">
                        {rf.blunder}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-2 text-[11px] text-emerald-300 leading-relaxed">
                    <span className="font-bold text-emerald-400">What to say instead: </span>
                    {rf.fix}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-zinc-800/80 bg-zinc-950 px-4 py-2 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>Curated for {tipData.badge}</span>
        <span>Updates live per domain</span>
      </div>
    </aside>
  );
};
