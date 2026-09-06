import { Fragment } from 'react';
import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';
import { ReportPageFrame } from './ReportPageFrame';
import { statsFor, mktFor, filterByRange } from '../../lib/analysis';
import type { SensorData } from '../../lib/analysis';
import type { AcceptanceCriteria, DataloggerPosition } from '../../types/report';

const ROWS_PER_PAGE = 20;

interface ComputedRow {
  position: DataloggerPosition;
  sensor: SensorData | null;
  avgT: number;
  avgH: number;
  maxT: number;
  maxH: number;
  minT: number;
  minH: number;
  mkt: number;
  pass: boolean | null;
}

function toEpoch(datetimeLocal: string): number | null {
  if (!datetimeLocal) return null;
  const ms = new Date(datetimeLocal).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function computeTestDataRows(
  dataloggers: DataloggerPosition[],
  sensors: SensorData[],
  startDateTime: string,
  endDateTime: string,
  limits: AcceptanceCriteria,
  isProtocol?: boolean,
): ComputedRow[] {
  const startMs = toEpoch(startDateTime);
  const endMs = toEpoch(endDateTime);
  const bounded = filterByRange(sensors, startMs, endMs);
  const byId = new Map(bounded.map((s) => [s.id, s]));

  return dataloggers
    .slice()
    .sort((a, b) => a.positionNumber - b.positionNumber)
    .map((position) => {
      const sensor = byId.get(position.serialNumber) ?? null;
      if (!sensor || sensor.rows.length === 0 || isProtocol) {
        return {
          position,
          sensor,
          avgT: NaN,
          avgH: NaN,
          maxT: NaN,
          maxH: NaN,
          minT: NaN,
          minH: NaN,
          mkt: NaN,
          pass: null,
        };
      }
      const stats = statsFor(sensor);
      const mkt = mktFor(sensor);
      const pass =
        stats.maxTemp <= limits.temperatureMaxC &&
        stats.minTemp >= limits.temperatureMinC &&
        stats.maxHum <= limits.humidityMaxPct &&
        stats.minHum >= limits.humidityMinPct;
      return {
        position,
        sensor,
        avgT: stats.avgTemp,
        avgH: stats.avgHum,
        maxT: stats.maxTemp,
        maxH: stats.maxHum,
        minT: stats.minTemp,
        minH: stats.minHum,
        mkt,
        pass,
      };
    });
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function TestDataTable({ rows }: { rows: ComputedRow[] }) {
  return (
    <table className="w-full border-collapse text-[9px]">
      <thead>
        <tr>
          <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-left font-semibold text-slate-600">
            Pos.
          </th>
          <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-left font-semibold text-slate-600">
            Sensor S/N
          </th>
          <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            Average
          </th>
          <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            Max.
          </th>
          <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            Min.
          </th>
          <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            MKT (°C)
          </th>
          <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            Pass
          </th>
        </tr>
        <tr>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">T (°C)</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">RH (%)</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">T (°C)</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">RH (%)</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">T (°C)</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">RH (%)</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={9} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
              No datalogger positions defined yet — add them in the Chamber Layout section.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.position.id}>
              <td className="border border-slate-300 px-1.5 py-1 text-slate-600">{row.position.positionNumber}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-slate-700">
                {row.position.serialNumber || '—'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.avgT)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.avgH)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.maxT)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.maxH)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.minT)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.minH)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(row.mkt)}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-center font-semibold">
                {row.pass === null ? (
                  <span className="text-slate-400">N/A</span>
                ) : row.pass ? (
                  <span className="text-emerald-600">YES</span>
                ) : (
                  <span className="text-rose-600">NO</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function TestDataSheetPages(props: { startPageNumber: number; totalPages: number }) {
  const { report } = useReport();
  const { sensors } = useAnalysis();
  if (!report) return null;
  const isProtocol = report.documentType === 'protocol';
  const rows = computeTestDataRows(
    report.chamberLayout.dataloggers,
    sensors,
    report.studyPeriod.startDateTime,
    report.studyPeriod.endDateTime,
    report.chamberDescription.acceptanceCriteria,
    isProtocol,
  );
  const chunks = chunk(rows, ROWS_PER_PAGE);
  const missingSensorCount = rows.filter((r) => r.sensor === null).length;

  return (
    <>
      {chunks.map((pageRows, idx) => (
        <Fragment key={idx}>
          <ReportPageFrame pageNumber={props.startPageNumber + idx} totalPages={props.totalPages}>
            {idx === 0 && (
              <>
                <h3 className="mb-1 text-xs font-bold text-slate-700">13.2 Test Data Sheet of Cycle</h3>
                <p className="mb-3 text-[9px] text-slate-500">
                  Computed from uploaded CSV data over the study period
                  {report.studyPeriod.startDateTime && report.studyPeriod.endDateTime
                    ? ` (${report.studyPeriod.startDateTime.replace('T', ' ')} → ${report.studyPeriod.endDateTime.replace('T', ' ')})`
                    : ''}
                  . Acceptance criteria: ({report.chamberDescription.acceptanceCriteria.temperatureMinC}–
                  {report.chamberDescription.acceptanceCriteria.temperatureMaxC}) °C, (
                  {report.chamberDescription.acceptanceCriteria.humidityMinPct}–
                  {report.chamberDescription.acceptanceCriteria.humidityMaxPct}) %RH.
                  {missingSensorCount > 0 && (
                    <span className="text-amber-600">
                      {' '}
                      {missingSensorCount} position{missingSensorCount === 1 ? '' : 's'} have no matching uploaded CSV
                      (serial number mismatch or file not uploaded yet).
                    </span>
                  )}
                </p>
              </>
            )}
            <TestDataTable rows={pageRows} />
          </ReportPageFrame>
        </Fragment>
      ))}
    </>
  );
}

export function chunkTestDataRows(
  dataloggers: DataloggerPosition[],
  sensors: SensorData[],
  startDateTime: string,
  endDateTime: string,
  limits: AcceptanceCriteria,
  isProtocol?: boolean,
): number {
  return chunk(computeTestDataRows(dataloggers, sensors, startDateTime, endDateTime, limits, isProtocol), ROWS_PER_PAGE).length;
}
