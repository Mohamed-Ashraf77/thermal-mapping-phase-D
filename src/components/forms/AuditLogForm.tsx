import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditLogForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const entries = report.auditLog;

  return (
    <SectionCard
      title="Activity Log"
      description="A lightweight, local record of key actions (uploads, exports, PDF generation) — useful context if you need to explain how a report was produced."
      actions={
        entries.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear the activity log? This cannot be undone.')) {
                update((r) => {
                  r.auditLog = [];
                });
              }
            }}
            className="text-xs font-medium text-rose-500 hover:text-rose-600"
          >
            Clear log
          </button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">No activity recorded yet.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-xs text-slate-600">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-baseline gap-2 border-b border-slate-100 pb-1.5">
              <span className="shrink-0 tabular-nums text-slate-400">{formatTimestamp(entry.timestamp)}</span>
              <span>{entry.action}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
