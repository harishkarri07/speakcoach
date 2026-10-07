import { useState, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { ChatView } from './components/ChatView';
import { AuthModal } from './components/AuthModal';
import { ModeSelectorModal } from './components/ModeSelectorModal';
import { VoicePreviewModal } from './components/VoicePreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { CoachingMode, TechnicalDomain, Profile } from './types/database';
import { useAuth } from './lib/auth-context';

const AnalyticsDashboard = lazy(() =>
  import('./components/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard }))
);

export default function App() {
  const { user, profile, streak, loading, isDemoMode, signOut, updateProfile } = useAuth();

  // Active Session Mode & Domain
  const [currentMode, setCurrentMode] = useState<CoachingMode>('free_talk');
  const [technicalDomain, setTechnicalDomain] = useState<TechnicalDomain>('soc_ir');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoicePreviewOpen, setIsVoicePreviewOpen] = useState(false);

  // Top-level view switcher (practice chat vs analytics dashboard)
  const [activeView, setActiveView] = useState<'practice' | 'analytics'>('practice');

  const handleSignOut = async () => {
    await signOut();
    setIsAuthModalOpen(true);
  };

  const handleSaveProfile = async (updates: Partial<Profile>) => {
    await updateProfile(updates);
  };

  const handleSelectMode = (mode: CoachingMode, domain?: TechnicalDomain) => {
    setCurrentMode(mode);
    if (domain) {
      setTechnicalDomain(domain);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs text-zinc-400">Initializing SpeakCoach...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        profile={profile}
        streak={streak}
        currentMode={currentMode}
        activeView={activeView}
        isDemoMode={isDemoMode}
        onChangeView={setActiveView}
        onOpenModeSelector={() => setIsModeSelectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Chat Interface with Real-time Interview Tips Sidebar */}
      <main className="mx-auto w-full max-w-[1600px] px-0 sm:px-2 md:px-4">
        {activeView === 'practice' ? (
          <ChatView
            currentMode={currentMode}
            technicalDomain={technicalDomain}
            profile={profile}
            streak={streak}
            onOpenModeSelector={() => setIsModeSelectorOpen(true)}
            onSwitchToVoice={() => setIsVoicePreviewOpen(true)}
            onDomainChange={(domain) => setTechnicalDomain(domain)}
          />
        ) : (
          <Suspense
            fallback={
              <div className="flex min-h-[500px] w-full items-center justify-center text-zinc-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                  <span className="text-xs">Loading analytics...</span>
                </div>
              </div>
            }
          >
            <AnalyticsDashboard
              userId={user?.id || profile?.id || ''}
              profile={profile}
              streak={streak}
              onReturnToPractice={() => setActiveView('practice')}
              onSelectDrill={handleSelectMode}
            />
          </Suspense>
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ModeSelectorModal
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
        currentMode={currentMode}
        technicalDomain={technicalDomain}
        onSelectMode={handleSelectMode}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />

      <VoicePreviewModal
        isOpen={isVoicePreviewOpen}
        onClose={() => setIsVoicePreviewOpen(false)}
      />
    </div>
  );
}
