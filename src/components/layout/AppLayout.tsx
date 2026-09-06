/**
 * AppLayout — The single persistent shell that wraps EVERY screen of the app
 * (Dashboard, document workspace, and any future screens like Users or Audit Viewer).
 *
 * Structure:
 *   ┌──────────────────────────────────────────────┐
 *   │  TOP HEADER (logo, document title, actions)  │
 *   ├──────────────┬───────────────────────────────┤
 *   │              │                               │
 *   │  LEFT        │  MAIN CONTENT AREA            │
 *   │  SIDEBAR     │  (Dashboard / Workspace)      │
 *   │  (collapsible│                               │
 *   │   on mobile) │                               │
 *   │              │                               │
 *   └──────────────┴───────────────────────────────┘
 *
 * The Sidebar has two "modes":
 *   • Dashboard mode (no document open): shows top-level app sections
 *     (Home, Users, System Audit Trail — future).
 *   • Workspace mode (document open): shows document sections (steps)
 *     grouped by category, plus a "Back to Dashboard" link at the top.
 *
 * Navigation state lives here so that both Dashboard and Workspace read
 * the same active section without drilling through multiple layers.
 */

import { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Eye,
  Download,
  Printer,
  RotateCcw,
  Loader2,
  ArrowLeft,
  FileCheck,
  ClipboardList,
  Database,
  ShieldCheck,
  Users,
  Activity,
  Lock,
  CheckCircle2,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';
import { useAudit } from '../../store/AuditContext';
import { SessionBar } from '../auth/SessionBar';
import { DocumentStatusBar } from './DocumentStatusBar';
import { UserManagementPanel } from '../auth/UserManagement';
import { AuditTrailViewer } from '../audit/AuditTrailViewer';
import { Dashboard } from './Dashboard';
import { useTheme } from '../../store/ThemeContext';

// ── Section / Step definitions ─────────────────────────────────────────────

export type SectionId =
  // Top-level (no document)
  | 'home'
  | 'users'         // Phase A — to be implemented
  | 'audit-viewer'  // Phase B — to be implemented
  // Document workspace
  | 'document-info'
  | 'introduction'
  | 'approval'
  | 'narrative'
  | 'chamber-desc'
  | 'loading-items'
  | 'chamber-layout'
  | 'sensor-data'
  | 'challenge-test'
  | 'calibration'
  | 'sop'
  | 'attachments'
  | 'deviations'
  | 'final-approval'
  | 'audit-log'
  | 'preview';

interface NavItem {
  id: SectionId;
  label: string;
  labelAr?: string;
  icon: React.ReactNode;
  badge?: 'future' | 'new';
  group?: string;
}

// Top-level nav items (Dashboard context)
const APP_NAV: NavItem[] = [
  {
    id: 'home',
    label: 'Document Manager',
    labelAr: 'إدارة المستندات',
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: 'Main',
  },
  {
    id: 'users',
    label: 'Users & Roles',
    labelAr: 'المستخدمون والصلاحيات',
    icon: <Users className="h-4 w-4" />,
    group: 'Administration',
  },
  {
    id: 'audit-viewer',
    label: 'System Audit Trail',
    labelAr: 'سجل الأحداث الشامل',
    icon: <Activity className="h-4 w-4" />,
    group: 'Administration',
  },
];

// Document workspace nav items
const DOC_NAV: NavItem[] = [
  // ── General Info ──────────────────────────────────────────────────
  { id: 'document-info',   label: 'Document Info',          labelAr: 'بيانات المستند',          icon: <FileText className="h-4 w-4" />,       group: 'General Info' },
  { id: 'introduction',    label: 'Introduction & Scope',   labelAr: 'المقدمة والنطاق',          icon: <ClipboardList className="h-4 w-4" />,   group: 'General Info' },
  { id: 'approval',        label: 'Review & Approvals',     labelAr: 'المراجعة والاعتماد',       icon: <CheckCircle2 className="h-4 w-4" />,    group: 'General Info' },
  { id: 'narrative',       label: 'Study Narrative',        labelAr: 'سرد الدراسة',             icon: <FileCheck className="h-4 w-4" />,       group: 'General Info' },
  // ── Chamber & Layout ──────────────────────────────────────────────
  { id: 'chamber-desc',    label: 'Chamber Description',    labelAr: 'وصف الغرفة',             icon: <Database className="h-4 w-4" />,        group: 'Chamber & Layout' },
  { id: 'loading-items',   label: 'Loading & Volume',       labelAr: 'التحميل والحجم',           icon: <Settings2 className="h-4 w-4" />,       group: 'Chamber & Layout' },
  { id: 'chamber-layout',  label: 'Layout & Photos',        labelAr: 'المخطط والصور',            icon: <LayoutDashboard className="h-4 w-4" />, group: 'Chamber & Layout' },
  // ── Data & Analysis ───────────────────────────────────────────────
  { id: 'sensor-data',     label: 'Sensor Data CSV',        labelAr: 'بيانات الحساسات',         icon: <Activity className="h-4 w-4" />,        group: 'Data & Analysis' },
  { id: 'challenge-test',  label: 'Challenge Tests',        labelAr: 'اختبارات التحدي',          icon: <ShieldCheck className="h-4 w-4" />,     group: 'Data & Analysis' },
  { id: 'calibration',     label: 'Calibration Records',    labelAr: 'سجلات المعايرة',           icon: <FileCheck className="h-4 w-4" />,       group: 'Data & Analysis' },
  // ── Appendices ────────────────────────────────────────────────────
  { id: 'sop',             label: 'SOP Availability',       labelAr: 'توافر الـ SOP',            icon: <ClipboardList className="h-4 w-4" />,   group: 'Appendices' },
  { id: 'attachments',     label: 'Attachments List',       labelAr: 'قائمة المرفقات',           icon: <FileText className="h-4 w-4" />,        group: 'Appendices' },
  { id: 'deviations',      label: 'Deviations',             labelAr: 'الانحرافات',              icon: <X className="h-4 w-4" />,               group: 'Appendices' },
  { id: 'final-approval',  label: 'Final Approval',         labelAr: 'الاعتماد النهائي',         icon: <Lock className="h-4 w-4" />,            group: 'Appendices' },
  // ── System ────────────────────────────────────────────────────────
  { id: 'audit-log',       label: 'Activity Log',           labelAr: 'سجل الأنشطة',             icon: <Activity className="h-4 w-4" />,        group: 'System' },
  // ── Output ────────────────────────────────────────────────────────
  { id: 'preview',         label: 'Preview & Export',       labelAr: 'معاينة وتصدير',            icon: <Eye className="h-4 w-4" />,             group: 'Output' },
];

// ── Helper: get unique group names in order ──────────────────────────────────
function getGroups(items: NavItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const g = item.group || '';
    if (!seen.has(g)) { seen.add(g); result.push(g); }
  });
  return result;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function SidebarItem({
  item,
  active,
  collapsed,
  onClick,
  disabled,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={collapsed ? item.label : undefined}
      className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all duration-150
        ${active
          ? 'bg-slate-900 text-white shadow-sm'
          : disabled
          ? 'cursor-not-allowed text-slate-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <span className={`shrink-0 ${active ? 'text-white' : disabled ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-700'}`}>
        {item.icon}
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge === 'future' && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Soon
            </span>
          )}
          {item.badge === 'new' && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
              New
            </span>
          )}
        </>
      )}

      {collapsed && item.badge === 'future' && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-300" />
      )}
    </button>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────

export function AppLayout() {
  const { report, openDocument, resetReport } = useReport();
  const { sensors } = useAnalysis();
  const { log } = useAudit();
  const { theme, toggleTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [pdfState, setPdfState] = useState<'idle' | 'generating' | 'error'>('idle');
  const [pdfError, setPdfError] = useState<string | null>(null);

  // When the user opens a document, switch to document-info section automatically
  const handleOpenDocument = useCallback((id: string | null) => {
    openDocument(id);
    if (id) {
      log({ action: 'DOCUMENT_OPENED', documentId: id, detail: `Opened document: ${id}` });
    }
    setActiveSection(id ? 'document-info' : 'home');
    setMobileOpen(false);
  }, [openDocument, log]);

  const handleNavigate = useCallback((id: SectionId) => {
    setActiveSection(id);
    setMobileOpen(false);
  }, []);

  // ── PDF download ──────────────────────────────────────────────────
  async function handleDownloadPdf() {
    if (!report) return;
    setPdfState('generating');
    setPdfError(null);
    try {
      const createRes = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, sensors }),
      });
      if (!createRes.ok) throw new Error('Could not prepare the report data for PDF export.');
      const { id } = (await createRes.json()) as { id: string };
      const pdfRes = await fetch(`/api/generate-pdf/${id}`, { method: 'POST' });
      if (!pdfRes.ok) {
        const body = await pdfRes.json().catch(() => ({ error: 'PDF generation failed.' }));
        throw new Error(body.error ?? 'PDF generation failed.');
      }
      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.documentInfo.documentNumber || 'report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdfState('idle');
      await log({
        action: 'PDF_GENERATED',
        documentId: report?.id,
        documentNumber: report?.documentInfo?.documentNumber,
        detail: 'PDF report generated and downloaded.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF generation failed.';
      setPdfState('error');
      setPdfError(message);
      await log({
        action: 'PDF_GENERATED',
        documentId: report?.id,
        detail: message,
        outcome: 'failure',
        failureReason: message,
      });
    }
  }

  // ── Derived nav state ─────────────────────────────────────────────
  const inWorkspace = !!report;
  const navItems = inWorkspace ? DOC_NAV : APP_NAV;
  const groups = getGroups(navItems);

  // ── Sidebar content ───────────────────────────────────────────────
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / App name */}
      <div className={`flex items-center gap-3 border-b border-slate-100 px-4 py-4 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
        <img
          src="/assets/thermal-validation-studio-icon.png"
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg object-cover"
        />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900">Thermal Validation</p>
            <p className="text-[10px] font-medium text-slate-400">GxP Studio</p>
          </div>
        )}
      </div>

      {/* Back to Dashboard (only in workspace mode) */}
      {inWorkspace && (
        <div className="border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            onClick={() => handleOpenDocument(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Back to Documents' : undefined}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!sidebarCollapsed && <span>All Documents</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="truncate text-[10px] font-bold text-slate-700">
                {report?.documentInfo.systemName || 'Unnamed Document'}
              </p>
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                report?.documentType === 'protocol'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'bg-violet-50 text-violet-700'
              }`}>
                {report?.documentType}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {groups.map((group) => {
          const items = navItems.filter((i) => (i.group || '') === group);
          return (
            <SidebarSection key={group} title={sidebarCollapsed ? '' : group}>
              {items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={activeSection === item.id}
                  collapsed={sidebarCollapsed}
                  disabled={item.badge === 'future'}
                  onClick={() => handleNavigate(item.id)}
                />
              ))}
            </SidebarSection>
          );
        })}
      </nav>

      {/* 21 CFR badge at the bottom */}
      {!sidebarCollapsed && (
        <div className="border-t border-slate-100 px-3 py-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>21 CFR Part 11 Ready</span>
          </div>
          <p className="mt-2 text-center text-[9px] font-medium text-slate-400">
            Developed by Mohamed Ashraf
          </p>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 bg-white transition-all duration-200 print:hidden
          ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile Sidebar (slide-over) ──────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Right side: top header + content ────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb */}
            {inWorkspace ? (
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {report?.documentInfo.systemName || 'Unnamed Document'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {DOC_NAV.find((n) => n.id === activeSection)?.label || 'Workspace'}
                  {report?.documentInfo.documentNumber && ` · ${report.documentInfo.documentNumber}`}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-900">Thermal Validation Studio</p>
                <p className="text-[10px] text-slate-400 font-medium">GxP Document Manager</p>
              </div>
            )}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            {inWorkspace && (
              <>
                <button
                  type="button"
                  onClick={() => { if (confirm('Reset all data?')) resetReport(); }}
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfState === 'generating'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60"
                >
                  {pdfState === 'generating'
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  {pdfState === 'generating' ? 'Generating…' : 'Download PDF'}
                </button>
                <div className="h-5 w-px bg-slate-200" />
              </>
            )}
            <SessionBar />
          </div>
        </header>

        {pdfState === 'error' && pdfError && (
          <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-6 py-2 text-xs text-rose-700 print:hidden">
            {pdfError}
          </div>
        )}

        {/* Document status bar — only shown when a document is open */}
        {inWorkspace && <DocumentStatusBar />}

        {/* ── Main content area ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <AppContent
            activeSection={activeSection}
            onOpenDocument={handleOpenDocument}
            onNavigate={handleNavigate}
          />
        </main>
      </div>
    </div>
  );
}

// ── Content Router ────────────────────────────────────────────────────────────
// Lazy import the heavy form/report components only here, keeping AppLayout lean.

import { DocumentInfoForm } from '../forms/DocumentInfoForm';
import { ApprovalForm } from '../forms/ApprovalForm';
import { IntroductionForm } from '../forms/IntroductionForm';
import { ChamberDescriptionForm } from '../forms/ChamberDescriptionForm';
import { NarrativeForm } from '../forms/NarrativeForm';
import { LoadingItemsForm } from '../forms/LoadingItemsForm';
import { ChamberLayoutForm } from '../forms/ChamberLayoutForm';
import { SensorDataForm } from '../forms/SensorDataForm';
import { ChallengeTestForm } from '../forms/ChallengeTestForm';
import { CalibrationForm } from '../forms/CalibrationForm';
import {
  SopAvailabilityForm,
  AttachmentsListForm,
  DeviationsForm,
  FinalApprovalForm,
} from '../forms/AppendicesForm';
import { AuditLogForm } from '../forms/AuditLogForm';
import { ReportPreview } from '../report/ReportPreview';
import { LockedOverlay } from './LockedOverlay';

const SECTION_COMPONENTS: Partial<Record<SectionId, React.ReactNode>> = {
  'document-info':  <DocumentInfoForm />,
  'introduction':   <IntroductionForm />,
  'approval':       <ApprovalForm />,
  'narrative':      <NarrativeForm />,
  'chamber-desc':   <ChamberDescriptionForm />,
  'loading-items':  <LoadingItemsForm />,
  'chamber-layout': <ChamberLayoutForm />,
  'sensor-data':    <SensorDataForm />,
  'challenge-test': <ChallengeTestForm />,
  'calibration':    <CalibrationForm />,
  'sop':            <SopAvailabilityForm />,
  'attachments':    <AttachmentsListForm />,
  'deviations':     <DeviationsForm />,
  'final-approval': <FinalApprovalForm />,
  'audit-log':      <AuditLogForm />,
};

function AppContent({
  activeSection,
  onOpenDocument,
  onNavigate,
}: {
  activeSection: SectionId;
  onOpenDocument: (id: string | null) => void;
  onNavigate: (id: SectionId) => void;
}) {
  const { report } = useReport();

  // Users Management (admin only)
  if (activeSection === 'users') {
    return <UserManagementPanel />;
  }

  // Audit viewer — Phase B
  if (activeSection === 'audit-viewer') {
    return <AuditTrailViewer />;
  }

  // Dashboard
  if (activeSection === 'home' || !report) {
    return <Dashboard onOpenDocument={onOpenDocument} />;
  }

  // Preview
  if (activeSection === 'preview') {
    return (
      <div className="preview-screen min-h-full bg-slate-100 p-4">
        <ReportPreview />
      </div>
    );
  }

  // Document section
  const component = SECTION_COMPONENTS[activeSection];
  if (!component) return null;

  const allDocSections = DOC_NAV.filter((n) => n.id !== 'preview');
  const currentIdx = allDocSections.findIndex((n) => n.id === activeSection);
  const prev = allDocSections[currentIdx - 1];
  const next = allDocSections[currentIdx + 1];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 print:p-0">
      <LockedOverlay>
        {component}
      </LockedOverlay>
      {/* Prev / Next navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 print:hidden">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onNavigate(prev.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {prev?.label || 'Previous'}
        </button>
        <span className="text-[11px] text-slate-400 font-medium">
          {currentIdx + 1} / {allDocSections.length}
        </span>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && onNavigate(next.id)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition"
        >
          {next?.label || 'Next'}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
