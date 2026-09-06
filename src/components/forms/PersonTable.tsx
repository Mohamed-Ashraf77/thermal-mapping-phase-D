import { Plus, Trash2 } from 'lucide-react';
import type { PersonEntry } from '../../types/report';
import { createId } from '../../utils/id';

const cellInput =
  'w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100';

export function PersonTable(props: {
  label: string;
  entries: PersonEntry[];
  onChange: (entries: PersonEntry[]) => void;
}) {
  const { label, entries, onChange } = props;

  function updateEntry(id: string, patch: Partial<PersonEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function addRow() {
    onChange([
      ...entries,
      { id: createId('person'), name: '', title: '', company: '', date: '', signaturePresent: false },
    ]);
  }

  function removeRow(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</h3>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Company</th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signed</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-3 text-center text-xs text-slate-400">
                  No entries yet — add a row.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={entry.name}
                    onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={entry.company}
                    onChange={(e) => updateEntry(entry.id, { company: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    className={cellInput}
                    value={entry.date}
                    onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={entry.signaturePresent}
                    onChange={(e) => updateEntry(entry.id, { signaturePresent: e.target.checked })}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(entry.id)}
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
    </div>
  );
}
