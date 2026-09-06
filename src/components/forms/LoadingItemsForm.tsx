import { useRef, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { createId } from '../../utils/id';
import { parseLoadingCsv, recalculateVolume } from '../../utils/loadingCsv';
import type { LoadingItem } from '../../types/report';

const cellInput =
  'w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100';

export function LoadingItemsForm() {
  const { report, update } = useReport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  if (!report) return null;
  const items = report.loadingItems;

  const totalBoxes = items.reduce((sum, it) => sum + (Number.isFinite(it.numberOfBoxes) ? it.numberOfBoxes : 0), 0);
  const totalVolume = items.reduce(
    (sum, it) => sum + (Number.isFinite(it.volumePerProductLiters) ? it.volumePerProductLiters : 0),
    0,
  );

  function patchItem(id: string, patch: Partial<Pick<LoadingItem, 'rowLabel' | 'numberOfBoxes' | 'boxVolumeMm3'>>) {
    update((r) => {
      const item = r.loadingItems.find((it) => it.id === id);
      if (!item) return;
      Object.assign(item, patch);
      item.volumePerProductLiters = recalculateVolume(item);
    });
  }

  function addRow() {
    update((r) => {
      r.loadingItems.push({
        id: createId('loading'),
        rowLabel: '',
        numberOfBoxes: 0,
        boxVolumeMm3: 0,
        volumePerProductLiters: 0,
      });
    });
  }

  function removeRow(id: string) {
    update((r) => {
      r.loadingItems = r.loadingItems.filter((it) => it.id !== id);
    });
  }

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { items: parsed, skippedLines } = parseLoadingCsv(String(reader.result ?? ''));
      update((r) => {
        r.loadingItems = parsed;
      });
      setImportMessage(
        parsed.length === 0
          ? 'No usable rows were found in that file.'
          : `Imported ${parsed.length} row${parsed.length === 1 ? '' : 's'}${
              skippedLines ? `, skipped ${skippedLines} unreadable line${skippedLines === 1 ? '' : 's'}` : ''
            }.`,
      );
    };
    reader.readAsText(file);
  }

  function syncTotalToChamberDescription() {
    update((r) => {
      r.chamberDescription.loadingVolumeLiters = Math.round(totalVolume * 100) / 100;
    });
  }

  return (
    <SectionCard
      title="Loading Description"
      description="Populates Section 13.1.1 — one row per product/box type. Import a CSV export or edit rows directly."
      actions={
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </button>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </button>
        </div>
      }
    >
      {importMessage && <p className="mb-3 text-xs text-sky-700">{importMessage}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Row label
              </th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                No. of boxes
              </th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Box volume (mm³)
              </th>
              <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Volume (L)
              </th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-xs text-slate-400">
                  No rows yet — import a CSV or add a row manually.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-2 py-1.5">
                  <input
                    className={cellInput}
                    value={item.rowLabel}
                    onChange={(e) => patchItem(item.id, { rowLabel: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className={cellInput}
                    value={item.numberOfBoxes}
                    onChange={(e) => patchItem(item.id, { numberOfBoxes: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className={cellInput}
                    value={item.boxVolumeMm3}
                    onChange={(e) => patchItem(item.id, { boxVolumeMm3: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5 text-xs text-slate-500">{item.volumePerProductLiters.toFixed(4)}</td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(item.id)}
                    className="text-slate-400 hover:text-rose-500"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-2 py-2 text-xs font-semibold text-slate-600">Total</td>
                <td className="px-2 py-2 text-xs font-semibold text-slate-600">{totalBoxes.toLocaleString()}</td>
                <td />
                <td className="px-2 py-2 text-xs font-semibold text-slate-600">{totalVolume.toFixed(2)} L</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {items.length > 0 && (
        <button
          type="button"
          onClick={syncTotalToChamberDescription}
          className="mt-3 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
        >
          Sync total ({totalVolume.toFixed(2)} L) to chamber description
        </button>
      )}
    </SectionCard>
  );
}
