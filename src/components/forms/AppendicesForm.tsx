import { Plus, Trash2 } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { PersonTable } from './PersonTable';
import { createId } from '../../utils/id';
import type { FinalVerdict } from '../../types/report';

const cellInput =
  'w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100';

export function SopAvailabilityForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const items = report.sopAvailability;

  return (
    <SectionCard
      title="SOP Availability"
      description="Populates Appendix N.1."
      actions={
        <button
          type="button"
          onClick={() =>
            update((r) => {
              r.sopAvailability.push({
                id: createId('sop'),
                sopType: '',
                applicable: true,
                title: '',
                identificationNumber: '',
              });
            })
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No SOPs listed yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  SOP Type
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Applicable
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  ID Number
                </th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={item.sopType}
                      onChange={(e) =>
                        update((r) => {
                          const it = r.sopAvailability.find((s) => s.id === item.id);
                          if (it) it.sopType = e.target.value;
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.applicable}
                      onChange={(e) =>
                        update((r) => {
                          const it = r.sopAvailability.find((s) => s.id === item.id);
                          if (it) it.applicable = e.target.checked;
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={item.title}
                      onChange={(e) =>
                        update((r) => {
                          const it = r.sopAvailability.find((s) => s.id === item.id);
                          if (it) it.title = e.target.value;
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={item.identificationNumber}
                      onChange={(e) =>
                        update((r) => {
                          const it = r.sopAvailability.find((s) => s.id === item.id);
                          if (it) it.identificationNumber = e.target.value;
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        update((r) => {
                          r.sopAvailability = r.sopAvailability.filter((s) => s.id !== item.id);
                        })
                      }
                      className="text-slate-400 hover:text-rose-500"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function AttachmentsListForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const items = report.attachments;

  return (
    <SectionCard
      title="Attachments List"
      description="Populates Appendix N.6."
      actions={
        <button
          type="button"
          onClick={() =>
            update((r) => {
              r.attachments.push({ id: createId('att'), description: '', numberOfPages: '' });
            })
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Description
              </th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                No. of pages
              </th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={item.description}
                    onChange={(e) =>
                      update((r) => {
                        const it = r.attachments.find((a) => a.id === item.id);
                        if (it) it.description = e.target.value;
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={item.numberOfPages}
                    onChange={(e) =>
                      update((r) => {
                        const it = r.attachments.find((a) => a.id === item.id);
                        if (it) it.numberOfPages = e.target.value;
                      })
                    }
                    placeholder='e.g. "23" or "CD"'
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      update((r) => {
                        r.attachments = r.attachments.filter((a) => a.id !== item.id);
                      })
                    }
                    className="text-slate-400 hover:text-rose-500"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function DeviationsForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const items = report.deviations;

  return (
    <SectionCard
      title="Deviations"
      description="Populates Appendix N.5. Leave empty if the study had no deviations — the report will state that explicitly."
      actions={
        <button
          type="button"
          onClick={() =>
            update((r) => {
              r.deviations.push({
                id: createId('dev'),
                deviationNumber: `DEV-${r.deviations.length + 1}`,
                description: '',
                correctiveAction: '',
                personInCharge: '',
                expectedClosureDate: '',
                resolved: false,
              });
            })
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add deviation
        </button>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No deviations recorded.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((dev) => (
            <div key={dev.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  className={`${cellInput} max-w-[160px] font-semibold`}
                  value={dev.deviationNumber}
                  onChange={(e) =>
                    update((r) => {
                      const it = r.deviations.find((d) => d.id === dev.id);
                      if (it) it.deviationNumber = e.target.value;
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    update((r) => {
                      r.deviations = r.deviations.filter((d) => d.id !== dev.id);
                    })
                  }
                  className="text-slate-400 hover:text-rose-500"
                  aria-label="Remove deviation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <textarea
                  className={cellInput}
                  placeholder="Description"
                  rows={2}
                  value={dev.description}
                  onChange={(e) =>
                    update((r) => {
                      const it = r.deviations.find((d) => d.id === dev.id);
                      if (it) it.description = e.target.value;
                    })
                  }
                />
                <textarea
                  className={cellInput}
                  placeholder="Corrective action"
                  rows={2}
                  value={dev.correctiveAction}
                  onChange={(e) =>
                    update((r) => {
                      const it = r.deviations.find((d) => d.id === dev.id);
                      if (it) it.correctiveAction = e.target.value;
                    })
                  }
                />
                <input
                  className={cellInput}
                  placeholder="Person in charge"
                  value={dev.personInCharge}
                  onChange={(e) =>
                    update((r) => {
                      const it = r.deviations.find((d) => d.id === dev.id);
                      if (it) it.personInCharge = e.target.value;
                    })
                  }
                />
                <input
                  type="date"
                  className={cellInput}
                  value={dev.expectedClosureDate}
                  onChange={(e) =>
                    update((r) => {
                      const it = r.deviations.find((d) => d.id === dev.id);
                      if (it) it.expectedClosureDate = e.target.value;
                    })
                  }
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={dev.resolved}
                    onChange={(e) =>
                      update((r) => {
                        const it = r.deviations.find((d) => d.id === dev.id);
                        if (it) it.resolved = e.target.checked;
                      })
                    }
                  />
                  Resolved
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

const VERDICT_OPTIONS: { value: FinalVerdict; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'passWithDeviation', label: 'Pass with deviation' },
  { value: 'negative', label: 'Negative' },
];

export function FinalApprovalForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const fa = report.finalApproval;

  return (
    <SectionCard title="Final Review & Approval" description="The closing verdict, notes, and approver signatures.">
      <div className="mb-4 flex flex-wrap gap-2">
        {VERDICT_OPTIONS.map((opt) => (
          <button
            key={opt.value ?? 'none'}
            type="button"
            onClick={() => update((r) => { r.finalApproval.verdict = opt.value; })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              fa.verdict === opt.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Notes</span>
        <textarea
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          rows={3}
          value={fa.notes}
          onChange={(e) => update((r) => { r.finalApproval.notes = e.target.value; })}
        />
      </label>

      <PersonTable
        label="Approver(s)"
        entries={fa.approvers}
        onChange={(entries) => update((r) => { r.finalApproval.approvers = entries; })}
      />
    </SectionCard>
  );
}
