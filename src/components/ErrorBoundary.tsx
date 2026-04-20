import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Auto-reload on chunk loading errors (usually due to new deployments)
    const isChunkLoadError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed');

    if (isChunkLoadError) {
      const reloadKey = 'chunk_error_reload';
      const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      const now = Date.now();
      
      // Only auto-reload if we haven't reloaded in the last 10 seconds to prevent infinite loops
      if (now - lastReload > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
        return;
      }
    }

    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-muted/10 flex items-center justify-center p-6 text-foreground font-sans">
          <div className="w-full max-w-2xl bg-card p-8 rounded-2xl border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong.</h1>
            <p className="text-zinc-400 mb-6">
              An unexpected error occurred in the application.
            </p>
            <div className="bg-muted/10 border border-border rounded-xl p-4 overflow-x-auto mb-6">
              <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
