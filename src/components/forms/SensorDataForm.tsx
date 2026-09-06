import { useRef } from 'react';
import { AlertTriangle, CheckCircle2, Download, Trash2, Upload } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';
import { useAudit } from '../../store/AuditContext';
import { SectionCard } from '../ui/SectionCard';
import { buildCombinedDataTable, combinedTableToCsv, downloadTextFile } from '../../lib/rawDataExport';

function toDatetimeLocalInput(iso: string): string {
  return iso;
}

export function SensorDataForm() {
  const { report, update } = useReport();
  const { sensors, loading, addFiles, removeSensor, clearAll } = useAnalysis();
  const { log } = useAudit();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const period = report?.studyPeriod;

  async function handleUpload(files: FileList) {
    const count = files.length;
    await addFiles(files);
    await log({
      action: 'SENSOR_CSV_UPLOADED',
      documentId: report?.id,
      documentNumber: report?.documentInfo?.documentNumber,
      detail: `Uploaded ${count} CSV file${count === 1 ? '' : 's'}: ${Array.from(files).map(f => f.name).join(', ')}`,
    });
  }

  function exportCombinedRawData() {
    if (!report) return;
    const table = buildCombinedDataTable(sensors, report.chamberLayout.dataloggers);
    const csv = combinedTableToCsv(table);
    const docNumber = report.documentInfo.documentNumber || 'thermal-mapping';
    downloadTextFile(`${docNumber}-raw-data-combined.csv`, csv);
    log({
      action: 'RAW_CSV_EXPORTED',
      documentId: report.id,
      documentNumber: report.documentInfo.documentNumber,
      detail: `Exported ${sensors.length} sensor(s), ${table.rows.length} time points`,
    });
  }

  return (
    <SectionCard
      title="Sensor Data & Study Period"
      description="Upload the raw datalogger CSV exports and set the main-cycle recording window. This data feeds Section 13.2 directly and is now saved in your browser's local database (IndexedDB), so it survives a page refresh."
      actions={
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Upload className="h-3.5 w-3.5" /> Upload CSV files
          </button>
          {sensors.length > 0 && (
            <button
              type="button"
              onClick={exportCombinedRawData}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
            >
              <Download className="h-3.5 w-3.5" /> Export combined raw data (CSV)
            </button>
          )}
          {sensors.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-rose-500 hover:text-rose-600"
            >
              Clear all
            </button>
          )}
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Recording started at
          </span>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            value={toDatetimeLocalInput(period?.startDateTime ?? '')}
            onChange={(e) => update((r) => { r.studyPeriod.startDateTime = e.target.value; })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Recording ended at
          </span>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            value={toDatetimeLocalInput(period?.endDateTime ?? '')}
            onChange={(e) => update((r) => { r.studyPeriod.endDateTime = e.target.value; })}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
          Loading previously saved sensor data…
        </div>
      ) : sensors.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
          No CSV files uploaded yet. File names should match the datalogger serial numbers entered in the layout
          table above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  File / Serial
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rows</th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sensors.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-1.5 text-xs text-slate-700">{s.id}</td>
                  <td className="px-2 py-1.5 text-xs text-slate-500">{s.rows.length.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-xs">
                    {s.error ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> {s.error}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Parsed
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeSensor(s.id)}
                      className="text-slate-400 hover:text-rose-500"
                      aria-label="Remove file"
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
