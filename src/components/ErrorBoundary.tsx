import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in the browser console for debugging, in addition to the
    // on-screen message below.
    console.error('Thermal Validation Studio crashed:', error, info.componentStack);
  }

  handleResetData = () => {
    try {
      localStorage.removeItem('thermal-mapping-report-document-v1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-sm font-semibold text-rose-700">Something went wrong</h1>
          <p className="mb-4 text-xs text-slate-600">
            The app hit an unexpected error while rendering. The details below are useful to share for a fix.
          </p>
          <pre className="mb-4 max-h-40 overflow-auto rounded bg-slate-900 p-3 text-[11px] text-rose-200">
            {error.message}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleResetData}
              className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
            >
              Reset saved report data & reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
