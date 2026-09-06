import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';
import { TOC_ENTRIES } from './tocData';

export function TableOfContentsPage(props: { totalPages: number }) {
  const { report } = useReport();
  const isProtocol = report?.documentType === 'protocol';

  const filteredEntries = TOC_ENTRIES.filter((entry) => {
    if (isProtocol) {
      if (
        entry.label.includes('13.2') ||
        entry.label === 'Charts' ||
        entry.label.includes('14.') ||
        entry.label.includes('Appendix N.5')
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <ReportPageFrame pageNumber={2} totalPages={props.totalPages}>
      <h2 className="mb-5 text-center text-lg font-bold uppercase tracking-wide text-slate-800">Index</h2>
      <ol className="flex flex-col gap-1 text-[11px] text-slate-700">
        {filteredEntries.map((entry) => (
          <li
            key={entry.label}
            className={`flex items-baseline gap-2 ${entry.indent ? 'ml-5 text-slate-600' : 'font-medium'}`}
          >
            <span>{entry.label}</span>
            <span className="flex-1 border-b border-dotted border-slate-300 translate-y-[-2px]" />
            <span className="tabular-nums text-slate-500">{entry.page ?? '—'}</span>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-center text-[10px] italic text-slate-400">
        Page numbers marked "—" resolve automatically once the corresponding section is generated in the full report
        assembly (Phase 3).
      </p>
    </ReportPageFrame>
  );
}
