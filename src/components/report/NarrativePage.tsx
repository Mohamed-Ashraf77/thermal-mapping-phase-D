import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

export function NarrativePage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const n = report.narrative;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <div className="flex flex-col gap-3 text-[11px] text-slate-600">
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">4. Requirements</h3>
          <p className="whitespace-pre-line">{n.requirementsText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">
            5. Locations &amp; Justification for Probe / Data Loggers
          </h3>
          <p className="whitespace-pre-line">{n.locationsJustificationText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">6. Procedures</h3>
          <p className="whitespace-pre-line">{n.proceduresText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">8. Revalidation Frequency</h3>
          <p className="whitespace-pre-line">{n.revalidationFrequencyText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">9. Result &amp; Evaluation</h3>
          <p className="whitespace-pre-line">{n.resultEvaluationText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">10. Summary &amp; Conclusion</h3>
          <p className="whitespace-pre-line">{n.summaryConclusionText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">11. Deviation</h3>
          <p className="whitespace-pre-line">{n.deviationText}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-bold text-slate-700">12. References</h3>
          {n.references.length === 0 ? (
            <p className="italic text-slate-400">No references entered.</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-4">
              {n.references.map((ref, i) => (
                <li key={i}>{ref || '—'}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ReportPageFrame>
  );
}
