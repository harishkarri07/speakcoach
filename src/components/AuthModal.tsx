import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Sparkles, Mail, Shield, CheckCircle, ArrowRight, Lock, User, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthenticated?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const { signInWithEmail, signUpWithEmail, useDemoAccount } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onAuthenticated?.();
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: err } = isSignUp 
      ? await signUpWithEmail(email.trim())
      : await signInWithEmail(email.trim());

    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSent(true);
      setTimeout(() => {
        handleSuccess();
      }, 1500);
    }
  };

  const handleDemo = () => {
    useDemoAccount();
    handleSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create Student Account' : 'Sign in to SpeakCoach'}
          </h2>
          <p className="text-xs text-slate-400">
            Personal English Speaking & Interview Mentor for Cybersecurity Students
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-0.5 text-[11px] text-slate-300">
            <Shield className="h-3 w-3 text-emerald-400" />
            <span>Secure Student Practice Space</span>
          </div>
        </div>

        {sent ? (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-center space-y-3">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-emerald-200">Authentication Link Sent</h3>
            <p className="text-xs text-slate-300">
              We sent a sign-in link to <strong className="text-white">{email}</strong>.
            </p>
            <button
              onClick={() => { setSent(false); handleSuccess(); }}
              className="mt-2 text-xs text-emerald-400 underline"
            >
              Continue to SpeakCoach
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Harish K."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                University / Personal Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-400 p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Continue with Email')}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-slate-400 hover:text-cyan-400 transition"
              >
                {isSignUp ? 'Already registered? Sign in' : "New student? Create an account"}
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-500">
                or instant evaluation
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleDemo}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Instant 3rd-Year Student Account (Harish K.)</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Private and encrypted session practice</span>
        </div>
      </div>
    </div>
  );
};
