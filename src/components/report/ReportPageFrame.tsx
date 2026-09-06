import type { ReactNode } from 'react';
import { useReport } from '../../store/ReportContext';

function formatIssueDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function ReportPageFrame(props: {
  pageNumber: number;
  totalPages: number;
  children: ReactNode;
  /** Cover page hides the running header/footer band. */
  bare?: boolean;
}) {
  const { pageNumber, totalPages, children, bare } = props;
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;

  return (
    <div className="report-page relative mx-auto flex h-[297mm] w-[210mm] flex-col bg-white text-slate-900 shadow-lg print:shadow-none">
      {!bare && (
        <header className="grid grid-cols-[1fr_2fr_1fr] items-stretch border-b-2 border-slate-800 text-[10px]">
          <div className="flex items-center justify-center border-r border-slate-300 p-2">
            {documentInfo.performingCompanyLogoDataUrl ? (
              <img
                src={documentInfo.performingCompanyLogoDataUrl}
                alt={documentInfo.performingCompanyName}
                className="max-h-10 max-w-full object-contain"
              />
            ) : (
              <img
                src="/assets/thermal-validation-studio-logo.png"
                alt="Thermal Validation Studio"
                className="max-h-10 max-w-full object-contain"
              />
            )}
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 border-r border-slate-300 p-2 text-center">
            <span className="text-[13px] font-bold uppercase tracking-wide">{documentInfo.reportTitle}</span>
            <span className="text-[10px] text-slate-500">
              {documentInfo.systemName}
              {documentInfo.systemCode ? ` (${documentInfo.systemCode})` : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-1 p-2 text-[9px] leading-tight">
            <span className="text-slate-500">Date</span>
            <span className="text-right font-medium">{formatIssueDate(documentInfo.issueDate)}</span>
            <span className="text-slate-500">Rev. No.</span>
            <span className="text-right font-medium">{documentInfo.revisionNumber}</span>
            <span className="text-slate-500">Doc. No.</span>
            <span className="text-right font-medium">{documentInfo.documentNumber}</span>
            <span className="text-slate-500">Form</span>
            <span className="text-right font-medium">{documentInfo.formReference}</span>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-hidden px-10 py-8">{children}</div>

      {!bare && (
        <footer className="flex items-center justify-between border-t border-slate-200 px-10 py-2 text-[9px] text-slate-400">
          <span>
            <span className="inline-flex items-center gap-1.5">
              <img
                src="/assets/thermal-validation-studio-icon.png"
                alt=""
                className="h-3.5 w-3.5 rounded object-cover"
              />
              <span>Thermal Validation Studio</span>
            </span>
          </span>
          <span>
            Page {pageNumber} of {totalPages}
          </span>
        </footer>
      )}
    </div>
  );
}
