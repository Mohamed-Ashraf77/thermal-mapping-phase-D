import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

function formatDisplayDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CoverPage(props: { totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;

  return (
    <ReportPageFrame pageNumber={1} totalPages={props.totalPages} bare>
      <div className="relative flex h-full flex-col items-center justify-between py-6 text-center">
        {documentInfo.performingCompanyLogoDataUrl && (
          <img
            src="/assets/thermal-validation-studio-logo.png"
            alt="Thermal Validation Studio"
            className="absolute left-2 top-2 h-auto w-32 object-contain"
          />
        )}
        <div className="flex flex-col items-center gap-1 pt-16">
          {documentInfo.performingCompanyLogoDataUrl ? (
            <img
              src={documentInfo.performingCompanyLogoDataUrl}
              alt={documentInfo.performingCompanyName || 'Performing Company'}
              className="mb-8 max-h-32 max-w-64 object-contain"
            />
          ) : (
            <img
              src="/assets/thermal-validation-studio-logo.png"
              alt="Thermal Validation Studio"
              className="mb-8 h-auto w-64 object-contain"
            />
          )}
          <h1 className="text-3xl font-bold italic text-slate-800">{documentInfo.reportTitle || 'Report Title'}</h1>
          <p className="mt-6 text-lg italic text-slate-500">For</p>
          <h2 className="mt-4 max-w-[70%] text-2xl font-bold italic text-slate-800">
            {documentInfo.systemName || 'System Name'}
          </h2>
          {documentInfo.systemCode && (
            <p className="text-lg italic text-slate-500">({documentInfo.systemCode})</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xl font-semibold text-slate-800">{documentInfo.clientName || 'Client Name'}</h3>
          {documentInfo.clientSite && <p className="text-sm text-slate-500">{documentInfo.clientSite}</p>}
          {documentInfo.clientLogoDataUrl && (
            <img src={documentInfo.clientLogoDataUrl} alt={documentInfo.clientName} className="mt-3 max-h-20 object-contain" />
          )}
        </div>

        <div className="w-full max-w-md">
          <table className="w-full border-collapse text-left text-xs">
            <tbody>
              <tr className="border-t border-slate-300">
                <td className="w-1/2 py-1.5 font-semibold text-slate-600">Issue date</td>
                <td className="py-1.5 italic text-slate-700">{formatDisplayDate(documentInfo.issueDate)}</td>
              </tr>
              <tr className="border-t border-slate-300">
                <td className="py-1.5 font-semibold text-slate-600">Document number</td>
                <td className="py-1.5 italic text-slate-700">{documentInfo.documentNumber || '—'}</td>
              </tr>
              <tr className="border-t border-b border-slate-300">
                <td className="py-1.5 font-semibold text-slate-600">Revision</td>
                <td className="py-1.5 italic text-slate-700">{documentInfo.revisionNumber || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {(documentInfo.contactAddressLines.length > 0 ||
          documentInfo.contactPhones.length > 0 ||
          documentInfo.contactEmail) && (
          <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
            {documentInfo.contactAddressLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
            {documentInfo.contactPhones.length > 0 && <span>{documentInfo.contactPhones.join(' · ')}</span>}
            {documentInfo.contactEmail && <span>{documentInfo.contactEmail}</span>}
          </div>
        )}
      </div>
    </ReportPageFrame>
  );
}
