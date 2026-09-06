import { Plus, Trash2 } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { TextAreaInput } from '../ui/Field';

export function NarrativeForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const n = report.narrative;

  function updateReference(index: number, value: string) {
    update((r) => {
      r.narrative.references[index] = value;
    });
  }
  function addReference() {
    update((r) => {
      r.narrative.references.push('');
    });
  }
  function removeReference(index: number) {
    update((r) => {
      r.narrative.references.splice(index, 1);
    });
  }

  return (
    <SectionCard
      title="Requirements, Procedures & Narrative Sections"
      description="Populates Sections 4 (Requirements), 5 (Locations & Justification), 6 (Procedures), 8-12 (Revalidation, Result & Evaluation, Summary & Conclusion, Deviation, References)."
    >
      <div className="grid grid-cols-1 gap-4">
        <TextAreaInput
          label="4. Requirements"
          value={n.requirementsText}
          onChange={(v) => update((r) => { r.narrative.requirementsText = v; })}
          rows={3}
        />
        <TextAreaInput
          label="5. Locations & Justification for Probe / Data Loggers"
          value={n.locationsJustificationText}
          onChange={(v) => update((r) => { r.narrative.locationsJustificationText = v; })}
          rows={3}
        />
        <TextAreaInput
          label="6. Procedures"
          value={n.proceduresText}
          onChange={(v) => update((r) => { r.narrative.proceduresText = v; })}
          rows={4}
        />
        <TextAreaInput
          label="8. Revalidation Frequency"
          value={n.revalidationFrequencyText}
          onChange={(v) => update((r) => { r.narrative.revalidationFrequencyText = v; })}
          rows={2}
        />
        <TextAreaInput
          label="9. Result & Evaluation"
          value={n.resultEvaluationText}
          onChange={(v) => update((r) => { r.narrative.resultEvaluationText = v; })}
          rows={2}
        />
        <TextAreaInput
          label="10. Summary & Conclusion"
          value={n.summaryConclusionText}
          onChange={(v) => update((r) => { r.narrative.summaryConclusionText = v; })}
          rows={2}
        />
        <TextAreaInput
          label="11. Deviation"
          value={n.deviationText}
          onChange={(v) => update((r) => { r.narrative.deviationText = v; })}
          rows={2}
        />
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">12. References</h3>
        <button
          type="button"
          onClick={addReference}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add reference
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {n.references.map((ref, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100"
              value={ref}
              onChange={(e) => updateReference(i, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeReference(i)}
              className="mt-1 text-slate-400 hover:text-rose-500"
              aria-label="Remove reference"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
