import { AuthProvider, useAuth } from './store/AuthContext';
import { AuditProvider } from './store/AuditContext';
import { ReportProvider } from './store/ReportContext';
import { AnalysisProvider } from './store/AnalysisContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrintRoute } from './print/PrintRoute';
import { ThemeProvider } from './store/ThemeContext';

// ── Auth-gated main app ───────────────────────────────────────────────────
function AuthGatedApp() {
  const { session, initialising } = useAuth();

  if (initialising) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          <p className="text-xs font-bold uppercase tracking-wide">Starting up…</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    // AuditProvider must be inside AuthProvider (needs the session) but
    // outside ReportProvider/AnalysisProvider so document events can be
    // logged without needing an open document.
    <AuditProvider>
      <ReportProvider>
        <AnalysisProvider>
          <AppLayout />
        </AnalysisProvider>
      </ReportProvider>
    </AuditProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
function App() {
  // /print/:id is only navigated to by Puppeteer — bypass auth + audit entirely
  const printMatch = window.location.pathname.match(/^\/print\/([A-Za-z0-9-]+)$/);
  if (printMatch) {
    return (
      <ReportProvider>
        <AnalysisProvider>
          <PrintRoute jobId={printMatch[1]} />
        </AnalysisProvider>
      </ReportProvider>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AuthGatedApp />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
