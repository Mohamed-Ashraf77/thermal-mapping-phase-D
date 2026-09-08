import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Activity, Download, Filter, RefreshCw, Search,
  ChevronLeft, ChevronRight, Shield, AlertTriangle,
  CheckCircle2, Info, X,
} from 'lucide-react';
import { useAudit } from '../../store/AuditContext';
import { useAuth } from '../../store/AuthContext';
import { queryAuditEntries, countAuditEntries, exportAuditTrailCsv } from '../../lib/auditStore';
import type { AuditFilter } from '../../lib/auditStore';
import { AUDIT_ACTION_LABELS } from '../../types/audit';
import { downloadTextFile } from '../../lib/rawDataExport';
import type { AuditEntry, AuditSeverity } from '../../types/audit';

const PAGE_SIZE = 50;

// ── Severity badge ─────────────────────────────────────────────────────────
const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  low: 'bg-slate-50 text-slate-500 border-slate-200',
};

const SEVERITY_ICONS: Record<AuditSeverity, React.ReactNode> = {
  critical: <AlertTriangle className="h-3 w-3" />,
  high: <AlertTriangle className="h-3 w-3" />,
  medium: <Info className="h-3 w-3" />,
  low: <CheckCircle2 className="h-3 w-3" />,
};

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_ICONS[severity]} {severity}
    </span>
  );
}

// ── Outcome badge ──────────────────────────────────────────────────────────
function OutcomeBadge({ outcome }: { outcome: 'success' | 'failure' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
      outcome === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
    }`}>
      {outcome === 'success' ? '✓' : '✗'} {outcome}
    </span>
  );
}

// ── Filter panel ───────────────────────────────────────────────────────────
function FilterPanel({
  filter, onChange, onClear,
}: {
  filter: AuditFilter;
  onChange: (f: Partial<AuditFilter>) => void;
  onClear: () => void;
}) {
  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition';

  const severities: AuditSeverity[] = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Filter className="h-3.5 w-3.5 text-slate-400" /> Filters
        </div>
        <button onClick={onClear}
          className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition">
          Clear all
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {/* Date from */}
        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">From</span>
          <input type="datetime-local" className={inputCls}
            value={filter.fromMs ? new Date(filter.fromMs).toISOString().slice(0, 16) : ''}
            onChange={(e) => onChange({ fromMs: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
        </label>
        {/* Date to */}
        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">To</span>
          <input type="datetime-local" className={inputCls}
            value={filter.toMs ? new Date(filter.toMs).toISOString().slice(0, 16) : ''}
            onChange={(e) => onChange({ toMs: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
        </label>
        {/* Severity */}
        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Severity</span>
          <select className={inputCls} value={filter.severity ?? ''}
            onChange={(e) => onChange({ severity: (e.target.value as AuditSeverity) || undefined })}>
            <option value="">All severities</option>
            {severities.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {/* Failures only */}
        <label className="flex items-center gap-2 pt-4 cursor-pointer">
          <input type="checkbox" checked={!!filter.failuresOnly}
            onChange={(e) => onChange({ failuresOnly: e.target.checked || undefined })}
            className="rounded border-slate-300" />
          <span className="text-xs font-bold text-slate-700">Failures only</span>
        </label>
      </div>
    </div>
  );
}

// ── Entry detail drawer ────────────────────────────────────────────────────
function EntryDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const rows: [string, string | null][] = [
    ['Entry ID', entry.id],
    ['Timestamp', new Date(entry.timestamp).toLocaleString('en-GB', { timeZoneName: 'short' })],
    ['User', `${entry.username} (${entry.userDisplayName})`],
    ['Role', entry.userRole],
    ['Session ID', entry.sessionId],
    ['Action', entry.action],
    ['Severity', entry.severity],
    ['Outcome', entry.outcome],
    ['Failure Reason', entry.failureReason],
    ['Document ID', entry.documentId],
    ['Document Number', entry.documentNumber],
    ['Document Type', entry.documentType],
    ['Field Path', entry.fieldPath],
    ['Old Value', entry.oldValue],
    ['New Value', entry.newValue],
    ['Detail', entry.detail],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Audit Entry Detail</h2>
            <p className="text-[10px] font-medium text-slate-400">Immutable record — read only</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <SeverityBadge severity={entry.severity} />
            <OutcomeBadge outcome={entry.outcome} />
          </div>
          <p className="mb-4 text-sm font-bold text-slate-800">
            {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
          </p>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {rows.map(([label, value]) => value !== null && value !== undefined && value !== '' ? (
                <tr key={label} className="border-b border-slate-50">
                  <td className="py-2 pr-4 font-bold text-slate-500 w-32 align-top">{label}</td>
                  <td className="py-2 font-mono text-slate-700 break-all">{value}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-[10px] text-amber-800 font-medium">
            <Shield className="mb-1 h-3.5 w-3.5 text-amber-600" />
            This record is tamper-evident and append-only. It cannot be modified or deleted
            in compliance with 21 CFR Part 11 §11.10(e).
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main viewer ────────────────────────────────────────────────────────────
export function AuditTrailViewer() {
  const { log } = useAudit();
  const { session } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [allTimeCount, setAllTimeCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AuditFilter>({});
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const effectiveFilter = useMemo<AuditFilter>(() => ({
    ...filter,
    organizationId: session?.organizationId,
    searchText: searchText || undefined,
  }), [filter, searchText, session?.organizationId]);

  const load = useCallback(async (p: number, f: AuditFilter) => {
    setLoading(true);
    try {
      const result = await queryAuditEntries(f, p, PAGE_SIZE);
      setEntries(result.entries);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      const total = await countAuditEntries({ organizationId: session?.organizationId });
      setAllTimeCount(total);
    } finally {
      setLoading(false);
    }
  }, [session?.organizationId]);

  useEffect(() => {
    load(page, effectiveFilter);
  }, [page, effectiveFilter, load]);

  function updateFilter(patch: Partial<AuditFilter>) {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(0);
  }

  function clearFilter() {
    setFilter({});
    setSearchText('');
    setPage(0);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportAuditTrailCsv(effectiveFilter);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadTextFile(`audit-trail-${timestamp}.csv`, csv);
      await log({ action: 'AUDIT_TRAIL_EXPORTED', detail: `Exported ${totalCount} entries` });
    } finally {
      setExporting(false);
    }
  }

  const activeFilterCount = Object.values(filter).filter(Boolean).length + (searchText ? 1 : 0);

  return (
    <>
      {selectedEntry && <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">System Audit Trail</h1>
              <p className="text-[11px] text-slate-400 font-medium">
                21 CFR Part 11 — tamper-evident, append-only activity log ·{' '}
                <span className="font-mono font-bold text-slate-600">{allTimeCount.toLocaleString()}</span> total entries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(page, effectiveFilter)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-extrabold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60">
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-3 relative">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
            placeholder="Search by username, action, document number, field, detail…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition"
          />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-3">
            <FilterPanel filter={filter} onChange={updateFilter} onClear={clearFilter} />
          </div>
        )}

        {/* Stats strip */}
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>
            Showing {Math.min(page * PAGE_SIZE + 1, totalCount)}–
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
            <span className="font-bold text-slate-700">{totalCount.toLocaleString()}</span> matching entries
          </span>
          <span className="text-[10px] text-slate-400">
            Click any row to see full detail
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="mx-auto mb-3 h-12 w-12 stroke-[1] text-slate-200" />
              <p className="text-sm font-bold text-slate-600">No entries match the current filter</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Severity', 'Document', 'Outcome'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="cursor-pointer hover:bg-slate-50/80 transition"
                  >
                    <td className="px-4 py-2.5 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-[11px] font-bold text-slate-800">{entry.username}</p>
                      <p className="text-[10px] text-slate-400">{entry.userDisplayName}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-[11px] font-medium text-slate-700">
                        {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      {entry.detail && (
                        <p className="mt-0.5 max-w-xs truncate text-[10px] text-slate-400">{entry.detail}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <SeverityBadge severity={entry.severity} />
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">
                      {entry.documentNumber ?? (entry.documentId ? '—' : '')}
                    </td>
                    <td className="px-4 py-2.5">
                      <OutcomeBadge outcome={entry.outcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs font-medium text-slate-500">
              Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
