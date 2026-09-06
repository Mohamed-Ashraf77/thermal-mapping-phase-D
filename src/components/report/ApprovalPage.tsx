import type { PersonEntry } from '../../types/report';
import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ApprovalTable({ title, rows }: { title: string; rows: PersonEntry[] }) {
  const displayRows = rows.length > 0 ? rows : [{ id: 'placeholder', name: '', title: '', company: '', date: '', signaturePresent: false }];
  return (
    <div className="mb-5">
      <h3 className="mb-1 text-[11px] font-bold italic text-slate-700">{title}</h3>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-100">
            {['Name', 'Title', 'Company', 'Date', 'Signature'].map((h) => (
              <th key={h} className="border border-slate-300 px-2 py-1 text-left font-semibold text-slate-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => (
            <tr key={row.id}>
              <td className="border border-slate-300 px-2 py-2">{row.name}</td>
              <td className="border border-slate-300 px-2 py-2">{row.title}</td>
              <td className="border border-slate-300 px-2 py-2">{row.company}</td>
              <td className="border border-slate-300 px-2 py-2">{formatDisplayDate(row.date)}</td>
              <td className="border border-slate-300 px-2 py-2 text-center text-slate-300">
                {row.signaturePresent ? '✓' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApprovalPage(props: { totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { approval, documentInfo } = report;

  return (
    <ReportPageFrame pageNumber={3} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">1. Document Review and Approval</h2>
      <ApprovalTable title={`${documentInfo.performingCompanyName || 'Performing Company'} Author(s)`} rows={approval.tagAuthors} />
      <ApprovalTable title="Tester(s)" rows={approval.tagTesters} />
      <ApprovalTable title="Reviewer(s)" rows={approval.tagReviewers} />
      <ApprovalTable
        title={`${documentInfo.clientName || 'Client'} Reviewer(s)`}
        rows={approval.clientReviewers}
      />
      <ApprovalTable title="Approver(s)" rows={approval.approvers} />
    </ReportPageFrame>
  );
}
