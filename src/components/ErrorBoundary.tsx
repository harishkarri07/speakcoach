import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SpeakCoach crashed:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
        <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
        <p className="max-w-md text-sm text-zinc-400">
          SpeakCoach hit an unexpected error. Reloading usually fixes it — your sessions are safe.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:from-cyan-400 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          Reload SpeakCoach
        </button>
      </div>
    );
  }
}
