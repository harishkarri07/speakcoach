import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ChatView } from './components/ChatView';
import { AuthModal } from './components/AuthModal';
import { ModeSelectorModal } from './components/ModeSelectorModal';
import { VoicePreviewModal } from './components/VoicePreviewModal';
import { CoachingMode, TechnicalDomain, Profile, Streak, Session } from './types/database';
import { DataService } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Active Session Mode & Domain
  const [currentMode, setCurrentMode] = useState<CoachingMode>('free_talk');
  const [technicalDomain, setTechnicalDomain] = useState<TechnicalDomain>('soc_ir');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isVoicePreviewOpen, setIsVoicePreviewOpen] = useState(false);

  // Initial Auth Check
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await DataService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthModalOpen(false);
        const [userProfile, userStreak, sessions] = await Promise.all([
          DataService.getProfile(currentUser.id),
          DataService.getStreak(currentUser.id),
          DataService.getRecentSessions(currentUser.id, 5),
        ]);
        setProfile(userProfile);
        setStreak(userStreak);
        setRecentSessions(sessions);
      } else {
        // If not logged in yet, load default student demo state so the user can immediately practice
        const demoUser = DataService.signInDemo();
        setUser(demoUser);
        const [userProfile, userStreak, sessions] = await Promise.all([
          DataService.getProfile(demoUser.id),
          DataService.getStreak(demoUser.id),
          DataService.getRecentSessions(demoUser.id, 5),
        ]);
        setProfile(userProfile);
        setStreak(userStreak);
        setRecentSessions(sessions);
      }
    } catch (err) {
      console.error('Error loading user session:', err);
      const demoUser = DataService.signInDemo();
      setUser(demoUser);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleAuthenticated = () => {
    loadUserData();
  };

  const handleSignOut = async () => {
    await DataService.signOut();
    setUser(null);
    setProfile(null);
    setStreak(null);
    setIsAuthModalOpen(true);
  };

  const handleSelectMode = (mode: CoachingMode, domain?: TechnicalDomain) => {
    setCurrentMode(mode);
    if (domain) {
      setTechnicalDomain(domain);
    }
  };

  if (isLoadingAuth) {
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
        onOpenModeSelector={() => setIsModeSelectorOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Chat Interface */}
      <main className="mx-auto max-w-7xl">
        <ChatView
          currentMode={currentMode}
          technicalDomain={technicalDomain}
          profile={profile}
          streak={streak}
          onOpenModeSelector={() => setIsModeSelectorOpen(true)}
          onSwitchToVoice={() => setIsVoicePreviewOpen(true)}
        />
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onAuthenticated={handleAuthenticated}
      />

      <ModeSelectorModal
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
        currentMode={currentMode}
        technicalDomain={technicalDomain}
        onSelectMode={handleSelectMode}
      />

      <VoicePreviewModal
        isOpen={isVoicePreviewOpen}
        onClose={() => setIsVoicePreviewOpen(false)}
      />
    </div>
  );
}
