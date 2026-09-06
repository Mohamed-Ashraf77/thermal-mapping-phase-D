import { useRef } from 'react';
import { Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { createId } from '../../utils/id';
import type { CalibrationRecord } from '../../types/report';

const cellInput =
  'w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CalibrationForm() {
  const { report, update } = useReport();
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  if (!report) return null;
  const records = report.calibrationRecords;

  function patch(id: string, changes: Partial<CalibrationRecord>) {
    update((r) => {
      const rec = r.calibrationRecords.find((c) => c.id === id);
      if (rec) Object.assign(rec, changes);
    });
  }

  function addRow() {
    update((r) => {
      r.calibrationRecords.push({
        id: createId('cal'),
        equipmentDescription: 'Data Logger',
        manufacturer: '',
        tagOrIdNumber: '',
        mostRecentCalibrationDate: '',
        calibrationDueDate: '',
        certificateFileName: null,
        certificateDataUrl: null,
      });
    });
  }

  function removeRow(id: string) {
    update((r) => {
      r.calibrationRecords = r.calibrationRecords.filter((c) => c.id !== id);
    });
  }

  function autoPopulateFromLayout() {
    update((r) => {
      const existingSerials = new Set(r.calibrationRecords.map((c) => c.tagOrIdNumber));
      r.chamberLayout.dataloggers.forEach((dl) => {
        if (!dl.serialNumber || existingSerials.has(dl.serialNumber)) return;
        r.calibrationRecords.push({
          id: createId('cal'),
          equipmentDescription: 'Data Logger',
          manufacturer: '',
          tagOrIdNumber: dl.serialNumber,
          mostRecentCalibrationDate: '',
          calibrationDueDate: '',
          certificateFileName: null,
          certificateDataUrl: null,
        });
      });
    });
  }

  async function handleCertificate(id: string, file: File | null) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    patch(id, { certificateFileName: file.name, certificateDataUrl: dataUrl });
  }

  return (
    <SectionCard
      title="Calibration Records"
      description="Populates Section 15 (Test Equipment Calibration Verification) and Appendix N.2. One row per datalogger/instrument."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoPopulateFromLayout}
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
          >
            <Sparkles className="h-3.5 w-3.5" /> Add from layout positions
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
      {records.length === 0 ? (
        <p className="text-xs text-slate-400">
          No calibration records yet — use "Add from layout positions" to seed one row per datalogger, or add rows
          manually.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Equipment
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Manufacturer
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Tag / ID No.
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Last calibration
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Due date
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Certificate
                </th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={rec.equipmentDescription}
                      onChange={(e) => patch(rec.id, { equipmentDescription: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={rec.manufacturer}
                      onChange={(e) => patch(rec.id, { manufacturer: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={cellInput}
                      value={rec.tagOrIdNumber}
                      onChange={(e) => patch(rec.id, { tagOrIdNumber: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      className={cellInput}
                      value={rec.mostRecentCalibrationDate}
                      onChange={(e) => patch(rec.id, { mostRecentCalibrationDate: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      className={cellInput}
                      value={rec.calibrationDueDate}
                      onChange={(e) => patch(rec.id, { calibrationDueDate: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => { fileInputsRef.current[rec.id] = el; }}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleCertificate(rec.id, e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputsRef.current[rec.id]?.click()}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                    >
                      <Upload className="h-3 w-3" />
                      {rec.certificateFileName ? rec.certificateFileName.slice(0, 14) : 'Upload'}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rec.id)}
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
