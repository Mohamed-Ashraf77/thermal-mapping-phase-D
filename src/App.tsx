import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { AuditProvider } from './store/AuditContext';
import { ReportProvider, useReport } from './store/ReportContext';
import { AnalysisProvider } from './store/AnalysisContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrintRoute } from './print/PrintRoute';
import { ThemeProvider } from './store/ThemeContext';

// Sensor CSV data is scoped per-document — this bridges the currently open
// document's id (from ReportContext) into AnalysisProvider so uploads are
// saved/loaded against that document instead of being shared globally.
function DocumentScopedAnalysisProvider({
  organizationId,
  children,
}: {
  organizationId?: string;
  children: ReactNode;
}) {
  const { report } = useReport();
  return (
    <AnalysisProvider organizationId={organizationId} documentId={report?.id}>
      {children}
    </AnalysisProvider>
  );
}

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
      <ReportProvider key={session.organizationId ?? 'local'} organizationId={session.organizationId} userId={session.userId}>
        <DocumentScopedAnalysisProvider organizationId={session.organizationId}>
          <AppLayout />
        </DocumentScopedAnalysisProvider>
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
