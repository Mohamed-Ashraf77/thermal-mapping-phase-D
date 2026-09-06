import { Fragment } from 'react';
import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';
import type { CalibrationRecord } from '../../types/report';

const ROWS_PER_PAGE = 24;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function CalibrationTable({ rows }: { rows: CalibrationRecord[] }) {
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
            Equipment
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
            Manufacturer
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
            Tag / ID No.
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
            Most Recent Calibration
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
            Calibration Due Date
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
              No calibration records entered yet.
            </td>
          </tr>
        ) : (
          rows.map((rec) => (
            <tr key={rec.id}>
              <td className="border border-slate-300 px-2 py-1.5">{rec.equipmentDescription || '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5">{rec.manufacturer || '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5">{rec.tagOrIdNumber || '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5">{rec.mostRecentCalibrationDate || '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5">{rec.calibrationDueDate || '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function CalibrationPages(props: { startPageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const chunks = chunk(report.calibrationRecords, ROWS_PER_PAGE);

  return (
    <>
      {chunks.map((rows, idx) => (
        <Fragment key={idx}>
          <ReportPageFrame pageNumber={props.startPageNumber + idx} totalPages={props.totalPages}>
            {idx === 0 && (
              <>
                <h2 className="mb-1 text-sm font-bold text-slate-800">15. Calibration Section</h2>
                <h3 className="mb-4 text-xs font-bold text-slate-700">
                  15.1 Test Equipment Calibration Verification
                </h3>
              </>
            )}
            <CalibrationTable rows={rows} />
          </ReportPageFrame>
        </Fragment>
      ))}
    </>
  );
}

export function countCalibrationPages(records: CalibrationRecord[]): number {
  return chunk(records, ROWS_PER_PAGE).length;
}
