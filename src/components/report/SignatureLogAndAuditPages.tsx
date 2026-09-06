import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';
import type { PersonEntry, ReportDocument } from '../../types/report';

interface SignatureLogRow {
  name: string;
  title: string;
  company: string;
}

/** Collects every named person across the approval groups and the final
 * approval, deduplicated by name (case-insensitive), for Appendix N.3.
 * Entries with an empty name are skipped.
 */
export function buildSignatureLogEntries(report: ReportDocument): SignatureLogRow[] {
  const groups: PersonEntry[][] = [
    report.approval.tagAuthors,
    report.approval.tagTesters,
    report.approval.tagReviewers,
    report.approval.clientReviewers,
    report.approval.approvers,
    report.finalApproval.approvers,
  ];

  const seen = new Map<string, SignatureLogRow>();
  groups.flat().forEach((p) => {
    const name = p.name.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { name, title: p.title, company: p.company });
    }
  });
  return Array.from(seen.values());
}

export function SignatureLogPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const rows = buildSignatureLogEntries(report);

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-1 text-sm font-bold text-slate-800">Appendix N.3 — Signature Log</h2>
      <p className="mb-4 text-[10px] italic text-slate-500">
        Auto-generated from the names entered in the Document Review &amp; Approval and Final Approval sections.
      </p>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Printed Name
            </th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Title
            </th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Company / Department
            </th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Initials
            </th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Signature
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
                No names entered yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.name}>
                <td className="border border-slate-300 px-2 py-3">{row.name}</td>
                <td className="border border-slate-300 px-2 py-3">{row.title || '—'}</td>
                <td className="border border-slate-300 px-2 py-3">{row.company || '—'}</td>
                <td className="border border-slate-300 px-2 py-3"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ReportPageFrame>
  );
}

export function CriticalParametersCalibrationPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const records = report.calibrationRecords;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-1 text-sm font-bold text-slate-800">Appendix N.2 — Critical Parameters Calibration List</h2>
      <p className="mb-4 text-[10px] italic text-slate-500">
        Auto-generated from the Calibration Records section.
      </p>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">No.</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Name</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Code No.</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Critical Part</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Calibration Code</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Calibration Date</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
                No calibration records entered yet.
              </td>
            </tr>
          ) : (
            records.map((rec, i) => (
              <tr key={rec.id}>
                <td className="border border-slate-300 px-2 py-1.5">{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1.5">{report.chamberDescription.systemName || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{report.chamberDescription.code || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{rec.equipmentDescription || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{rec.tagOrIdNumber || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{rec.mostRecentCalibrationDate || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{rec.calibrationDueDate || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ReportPageFrame>
  );
}

export function AuditLogPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const entries = report.auditLog;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-1 text-sm font-bold text-slate-800">Audit Trail</h2>
      <p className="mb-4 text-[10px] italic text-slate-500">
        A local record of key actions taken while producing this report (uploads, exports, PDF generation).
      </p>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Timestamp
            </th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={2} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
                No activity recorded yet.
              </td>
            </tr>
          ) : (
            entries
              .slice()
              .reverse()
              .map((entry) => (
                <tr key={entry.id}>
                  <td className="border border-slate-300 px-2 py-1.5 tabular-nums">
                    {new Date(entry.timestamp).toLocaleString('en-GB')}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">{entry.action}</td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </ReportPageFrame>
  );
}
