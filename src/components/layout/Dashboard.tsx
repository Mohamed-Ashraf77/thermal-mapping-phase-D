import { useState } from 'react';
import { useReport } from '../../store/ReportContext';
import { useAudit } from '../../store/AuditContext';
import {
  FileText, Plus, Trash2, Copy, ArrowRight, ClipboardList, Loader2,
  Calendar, BookOpen, Search, Filter, X, CheckCircle2, Clock3, FileStack,
  AlertTriangle, ArrowUpDown, Building2, RotateCcw, Grid2X2, List,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

interface DashboardProps {
  /** Called when the user wants to open a specific document workspace.
   *  Passing null navigates back to the dashboard (no-op here but kept
   *  for API consistency with AppLayout). */
  onOpenDocument?: (id: string | null) => void;
}

export function Dashboard({ onOpenDocument }: DashboardProps) {
  const { allDocuments, loadingDocs, createDocument, deleteDoc, duplicateDoc, openDocument } = useReport();
  const { log } = useAudit();
  const [newDocType, setNewDocType] = useState<'report' | 'protocol' | null>(null);
  const [systemName, setSystemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'protocol' | 'report'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'under_review' | 'approved'>('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'status'>('updated');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() =>
    window.localStorage.getItem('thermal-documents-view') === 'list' ? 'list' : 'cards',
  );
  const [pageSize, setPageSize] = useState<6 | 12 | 24>(() => {
    const saved = Number(window.localStorage.getItem('thermal-documents-page-size'));
    return saved === 12 || saved === 24 ? saved : 6;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDocType) return;
    setIsCreating(true);
    try {
      const doc = await createDocument(newDocType, systemName || undefined);
      await log({
        action: 'DOCUMENT_CREATED',
        documentId: doc.id,
        documentNumber: doc.documentInfo.documentNumber || undefined,
        documentType: newDocType,
        detail: `Created ${newDocType}: "${systemName || 'Untitled'}"`,
      });
      setSystemName('');
      setNewDocType(null);
      if (onOpenDocument) onOpenDocument(doc.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpen(id: string) {
    openDocument(id);
    onOpenDocument?.(id);
  }

  async function handleDelete(doc: typeof allDocuments[0]) {
    if (!confirm('Permanently delete this document?')) return;
    await deleteDoc(doc.id);
    await log({
      action: 'DOCUMENT_DELETED',
      documentId: doc.id,
      documentNumber: doc.documentInfo.documentNumber || undefined,
      documentType: doc.documentType,
      detail: `Deleted ${doc.documentType}: "${doc.documentInfo.systemName || 'Untitled'}"`,
    });
  }

  async function handleDuplicate(doc: typeof allDocuments[0], asType?: 'report' | 'protocol') {
    const created = await duplicateDoc(doc.id, asType);
    const action = asType && asType !== doc.documentType ? 'DOCUMENT_CONVERTED' : 'DOCUMENT_DUPLICATED';
    await log({
      action,
      documentId: created.id,
      documentNumber: created.documentInfo.documentNumber || undefined,
      documentType: created.documentType,
      detail: `${action === 'DOCUMENT_CONVERTED' ? 'Converted' : 'Duplicated'} from ${doc.id}`,
    });
    return created;
  }

  function formatDate(isoStr: string) {
    try {
      return new Date(isoStr).toLocaleDateString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return isoStr; }
  }

  function reachesAnnualReviewWithin30Days(createdAt: string) {
    const created = new Date(createdAt);
    if (!Number.isFinite(created.getTime())) return false;

    const now = new Date();
    const annualReviewDate = new Date(created);
    annualReviewDate.setFullYear(created.getFullYear() + 1);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = new Date(
      annualReviewDate.getFullYear(),
      annualReviewDate.getMonth(),
      annualReviewDate.getDate(),
    );
    const windowEnd = new Date(today);
    windowEnd.setDate(today.getDate() + 30);

    return dueDate >= today && dueDate <= windowEnd;
  }

  const totalCount = allDocuments.length;
  const draftCount = allDocuments.filter((d) => d.status === 'draft').length;
  const reviewCount = allDocuments.filter((d) => d.status === 'under_review').length;
  const approvedCount = allDocuments.filter((d) => d.status === 'approved').length;
  const reviewDocuments = allDocuments.filter((d) => d.status === 'under_review');
  const incompleteDocuments = allDocuments.filter((d) =>
    !d.documentInfo.systemName || !d.documentInfo.documentNumber || !d.documentInfo.clientName,
  );
  const expiringCalibrations = allDocuments.filter((d) => reachesAnnualReviewWithin30Days(d.createdAt));

  const companies = Array.from(new Set(
    allDocuments.map((doc) => doc.documentInfo.clientName.trim()).filter(Boolean),
  )).sort((a, b) => a.localeCompare(b));

  const filteredDocuments = allDocuments.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.documentInfo.systemName.toLowerCase().includes(q) ||
      (doc.documentInfo.documentNumber || '').toLowerCase().includes(q) ||
      (doc.documentInfo.clientName || '').toLowerCase().includes(q);
    const matchesType = filterType === 'all' || doc.documentType === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesCompany = filterCompany === 'all' || doc.documentInfo.clientName === filterCompany;
    return matchesSearch && matchesType && matchesStatus && matchesCompany;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return (a.documentInfo.systemName || '').localeCompare(b.documentInfo.systemName || '');
    }
    if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const hasActiveFilters = Boolean(
    searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterCompany !== 'all',
  );
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const visibleDocuments = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateViewMode(mode: 'cards' | 'list') {
    setViewMode(mode);
    window.localStorage.setItem('thermal-documents-view', mode);
  }

  function updatePageSize(size: 6 | 12 | 24) {
    setPageSize(size);
    setCurrentPage(1);
    window.localStorage.setItem('thermal-documents-page-size', String(size));
  }

  function clearFilters() {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterCompany('all');
    setSortBy('updated');
    setCurrentPage(1);
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* ── Dashboard header and overview ─────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6 py-6 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600">Thermal Validation Studio</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Document Manager</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your workspace for GxP-compliant thermal validation studies
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNewDocType('protocol')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
              >
                <ClipboardList className="h-4 w-4" />
                New Protocol
              </button>
              <button
                onClick={() => setNewDocType('report')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
              >
                <FileText className="h-4 w-4" />
                New Report
              </button>
            </div>
          </div>

          {/* Overview cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total documents', value: totalCount, icon: <FileStack className="h-4 w-4" />, tone: 'text-cyan-600 bg-cyan-50' },
                { label: 'Drafts', value: draftCount, icon: <Clock3 className="h-4 w-4" />, tone: 'text-slate-600 bg-slate-100' },
                { label: 'Under review', value: reviewCount, icon: <BookOpen className="h-4 w-4" />, tone: 'text-amber-600 bg-amber-50' },
                { label: 'Approved', value: approvedCount, icon: <CheckCircle2 className="h-4 w-4" />, tone: 'text-emerald-600 bg-emerald-50' },
              ].map(({ label, value, icon, tone }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-0.5 text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Action required</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Items that may need your attention</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Documents awaiting review', documents: reviewDocuments },
              { label: 'Incomplete document details', documents: incompleteDocuments },
              { label: 'Annual review due within 30 days', documents: expiringCalibrations },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setExpandedAction((current) => current === item.label ? null : item.label)}
                  aria-expanded={expandedAction === item.label}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                  <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{item.documents.length}</span>
                </button>
                {expandedAction === item.label && (
                  item.documents.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleOpen(doc.id)}
                          title={`Open ${doc.documentInfo.systemName || doc.documentInfo.documentNumber || 'document'}`}
                          className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-1 text-left text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                        >
                          <span className="max-w-[10rem] truncate">
                            {doc.documentInfo.systemName || doc.documentInfo.documentNumber || 'Unnamed document'}
                          </span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400">Nothing to review</p>
                  )
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Document list ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Search + filter */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search documents…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select value={filterType} onChange={(e) => { setFilterType(e.target.value as typeof filterType); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold capitalize text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <option value="all">All types</option>
                  <option value="protocol">Protocols</option>
                  <option value="report">Reports</option>
                </select>
              </label>
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as typeof filterStatus); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <option value="all">All statuses</option>
                <option value="draft">Drafts</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
              </select>
              <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setCurrentPage(1); }} className="max-w-[12rem] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <option value="all">All companies</option>
                {companies.map((company) => <option key={company} value={company}>{company}</option>)}
              </select>
              <label className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <option value="updated">Last updated</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
              </label>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              )}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button type="button" onClick={() => updateViewMode('cards')} aria-label="Card view" aria-pressed={viewMode === 'cards'} className={`rounded-md p-1.5 ${viewMode === 'cards' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Grid2X2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => updateViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded-md p-1.5 ${viewMode === 'list' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <select value={pageSize} onChange={(e) => updatePageSize(Number(e.target.value) as 6 | 12 | 24)} aria-label="Documents per page" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <option value={6}>6 / page</option>
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span>{filteredDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredDocuments.length)} of {filteredDocuments.length} documents</span>
            {filterCompany !== 'all' && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {filterCompany}</span>}
          </div>
        </div>

        {/* Document cards */}
        {loadingDocs ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-xs font-bold uppercase tracking-wide">Loading documents…</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="mx-auto h-14 w-14 stroke-[1] text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-600">No documents found</p>
            <p className="mt-1 text-xs text-slate-400">Create a new Protocol or Report to get started.</p>
          </div>
        ) : (
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
            {visibleDocuments.map((doc) => {
              const isProtocol = doc.documentType === 'protocol';
              return (
                <div
                  key={doc.id}
                  className={`group relative gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-cyan-200 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800 ${viewMode === 'cards' ? 'flex flex-col' : 'grid md:grid-cols-[minmax(13rem,1.4fr)_minmax(13rem,1fr)_auto] md:items-center'}`}
                >
                  {/* Type badge + status */}
                  <div className={`flex flex-wrap items-center gap-2 md:min-w-0 ${viewMode === 'list' ? 'md:flex-col md:items-start md:gap-1' : ''}`}>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isProtocol ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {isProtocol ? <ClipboardList className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      {doc.documentType}
                    </span>

                    {/* Document status badge */}
                    {doc.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        🔒 Approved
                      </span>
                    )}
                    {doc.status === 'under_review' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        ⏳ Under Review
                      </span>
                    )}

                    {doc.documentInfo.documentNumber && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {doc.documentInfo.documentNumber}
                      </span>
                    )}
                    {doc.documentInfo.clientName && (
                      <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-300">
                        {doc.documentInfo.clientName}
                      </span>
                    )}
                  </div>

                  <h3 className={`min-w-0 text-sm font-bold leading-snug text-slate-900 dark:text-white ${viewMode === 'list' ? 'md:truncate' : ''}`}>
                    {doc.documentInfo.systemName || 'Unnamed Document'}
                  </h3>

                  <p className={`flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-400 ${viewMode === 'list' ? 'md:truncate' : ''}`}>
                    <Calendar className="h-3 w-3" /> {doc.documentInfo.clientName || 'Company not specified'} · {formatDate(doc.updatedAt)}
                  </p>

                  {/* Actions */}
                  <div className={`flex items-center gap-1.5 border-slate-100 pt-3 dark:border-slate-700 ${viewMode === 'cards' ? 'border-t' : 'border-t md:border-t-0 md:border-l md:pl-4 md:pt-0'}`}>
                    {isProtocol ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Create a Report copy of this Protocol?')) {
                            const created = await handleDuplicate(doc, 'report');
                            handleOpen(created.id);
                          }
                        }}
                        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-cyan-100 bg-cyan-50 px-2.5 py-1.5 text-[11px] font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60"
                      >
                        <ArrowRight className="h-3 w-3" /> To Report
                      </button>
                    ) : (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Create a Protocol copy of this Report?')) {
                            const created = await handleDuplicate(doc, 'protocol');
                            handleOpen(created.id);
                          }
                        }}
                        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-cyan-100 bg-cyan-50 px-2.5 py-1.5 text-[11px] font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60"
                      >
                        <ArrowRight className="h-3 w-3" /> To Protocol
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(doc); }}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                      className="rounded-lg border border-rose-200 p-1.5 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900 dark:hover:bg-rose-950/40"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpen(doc.id)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loadingDocs && filteredDocuments.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-semibold text-slate-500">Page {currentPage} of {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Create document modal ─────────────────────────────────────── */}
      {newDocType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${newDocType === 'protocol' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}`}>
                  {newDocType === 'protocol' ? <ClipboardList className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    New {newDocType === 'protocol' ? 'Study Protocol' : 'Study Report'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {newDocType === 'protocol' ? 'بروتوكول دراسة جديد' : 'تقرير دراسة جديد'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setNewDocType(null); setSystemName(''); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Chamber / System Name
                </span>
                <input
                  type="text"
                  required
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder='e.g. "Stability Chamber QC-STB-01"'
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  autoFocus
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setNewDocType(null); setSystemName(''); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
