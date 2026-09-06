import { Fragment } from 'react';
import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';
import { ReportPageFrame } from './ReportPageFrame';
import { computeRecoveryMetric, formatDurationMinutes } from '../../lib/analysis';
import type { SensorData } from '../../lib/analysis';
import type { AcceptanceCriteria, ChallengeTestMeta, DataloggerPosition } from '../../types/report';

const ROWS_PER_PAGE = 20;

const TYPE_LABELS: Record<ChallengeTestMeta['type'], string> = {
  powerFailure: 'Power Failure',
  openDoor: 'Open Door',
};

interface ChallengeRow {
  position: DataloggerPosition;
  sensor: SensorData | null;
  tempOutOfSpec: boolean;
  tempExcursionMin: number;
  tempRecoveryMin: number | null;
  humOutOfSpec: boolean;
  humExcursionMin: number;
  humRecoveryMin: number | null;
}

function combineDateTime(date: string, time: string): number | null {
  if (!date || !time) return null;
  const ms = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function computeChallengeRows(
  test: ChallengeTestMeta,
  dataloggers: DataloggerPosition[],
  sensors: SensorData[],
  limits: AcceptanceCriteria,
  isProtocol?: boolean,
): ChallengeRow[] {
  const startMs = combineDateTime(test.date, test.startTime);
  const endMs = combineDateTime(test.date, test.endTime);
  const byId = new Map(sensors.map((s) => [s.id, s]));

  return dataloggers
    .slice()
    .sort((a, b) => a.positionNumber - b.positionNumber)
    .map((position) => {
      const sensor = byId.get(position.serialNumber) ?? null;
      if (!sensor || sensor.rows.length === 0 || startMs === null || endMs === null || isProtocol) {
        return {
          position,
          sensor,
          tempOutOfSpec: false,
          tempExcursionMin: 0,
          tempRecoveryMin: null,
          humOutOfSpec: false,
          humExcursionMin: 0,
          humRecoveryMin: null,
        };
      }
      const windowRows = sensor.rows.filter((r) => r.datetime >= startMs && r.datetime <= endMs);
      const tempResult = computeRecoveryMetric(windowRows, (r) => r.temp, limits.temperatureMinC, limits.temperatureMaxC);
      const humResult = computeRecoveryMetric(windowRows, (r) => r.humidity, limits.humidityMinPct, limits.humidityMaxPct);
      return {
        position,
        sensor,
        tempOutOfSpec: tempResult.outOfSpec,
        tempExcursionMin: tempResult.excursionDurationMinutes,
        tempRecoveryMin: tempResult.recoveryMinutes,
        humOutOfSpec: humResult.outOfSpec,
        humExcursionMin: humResult.excursionDurationMinutes,
        humRecoveryMin: humResult.recoveryMinutes,
      };
    });
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function recoveryLabel(recoveryMinutes: number | null, outOfSpec: boolean): string {
  if (!outOfSpec) return '—';
  if (recoveryMinutes === null) return 'Did not recover';
  return formatDurationMinutes(recoveryMinutes);
}

function ChallengeTable({ rows }: { rows: ChallengeRow[] }) {
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
          <th colSpan={3} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            Temperature
          </th>
          <th colSpan={3} className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">
            Relative Humidity
          </th>
        </tr>
        <tr>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Out of spec</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Excursion</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Recovery</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Out of spec</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Excursion</th>
          <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Recovery</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
              No datalogger positions defined yet.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.position.id}>
              <td className="border border-slate-300 px-1.5 py-1 text-slate-600">{row.position.positionNumber}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-slate-700">{row.position.serialNumber || '—'}</td>
              <td className="border border-slate-300 px-1.5 py-1 text-center">
                {!row.sensor ? (
                  <span className="text-slate-400">N/A</span>
                ) : row.tempOutOfSpec ? (
                  <span className="text-rose-600">YES</span>
                ) : (
                  <span className="text-emerald-600">NO</span>
                )}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">
                {row.tempOutOfSpec ? formatDurationMinutes(row.tempExcursionMin) : '—'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">
                {recoveryLabel(row.tempRecoveryMin, row.tempOutOfSpec)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-center">
                {!row.sensor ? (
                  <span className="text-slate-400">N/A</span>
                ) : row.humOutOfSpec ? (
                  <span className="text-rose-600">YES</span>
                ) : (
                  <span className="text-emerald-600">NO</span>
                )}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">
                {row.humOutOfSpec ? formatDurationMinutes(row.humExcursionMin) : '—'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right">
                {recoveryLabel(row.humRecoveryMin, row.humOutOfSpec)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function ChallengeTestPages(props: { startPageNumber: number; totalPages: number }) {
  const { report } = useReport();
  const { sensors } = useAnalysis();
  if (!report) return null;
  const isProtocol = report.documentType === 'protocol';
  let pageCursor = props.startPageNumber;

  if (report.challengeTests.length === 0) {
    return (
      <ReportPageFrame pageNumber={pageCursor} totalPages={props.totalPages}>
        <h2 className="mb-4 text-sm font-bold text-slate-800">14. Challenge Tests</h2>
        <p className="text-[11px] text-slate-400">No challenge tests configured yet.</p>
      </ReportPageFrame>
    );
  }

  return (
    <>
      {report.challengeTests.map((test, testIdx) => {
        const rows = computeChallengeRows(
          test,
          report.chamberLayout.dataloggers,
          sensors,
          report.chamberDescription.acceptanceCriteria,
          isProtocol,
        );
        const chunks = chunk(rows, ROWS_PER_PAGE);
        const startForThisTest = pageCursor;
        pageCursor += chunks.length;

        return (
          <Fragment key={test.id}>
            {chunks.map((pageRows, idx) => (
              <ReportPageFrame key={idx} pageNumber={startForThisTest + idx} totalPages={props.totalPages}>
                {idx === 0 && (
                  <>
                    <h2 className="mb-1 text-sm font-bold text-slate-800">
                      {testIdx === 0 ? '14. Challenge Tests' : '\u00A0'}
                    </h2>
                    <h3 className="mb-1 text-xs font-bold text-slate-700">
                      14.{testIdx + 1} {TYPE_LABELS[test.type]} Test
                    </h3>
                    <p className="mb-3 text-[9px] text-slate-500">
                      {test.date && test.startTime && test.endTime
                        ? `${test.date} — ${test.startTime} to ${test.endTime} (planned ${test.plannedDurationMinutes} min)`
                        : 'Date/time window not set yet.'}
                    </p>
                  </>
                )}
                <ChallengeTable rows={pageRows} />
              </ReportPageFrame>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

export function countChallengeTestPages(
  challengeTests: ChallengeTestMeta[],
  dataloggers: DataloggerPosition[],
  sensors: SensorData[],
  limits: AcceptanceCriteria,
  isProtocol?: boolean,
): number {
  if (challengeTests.length === 0) return 1;
  return challengeTests.reduce((total, test) => {
    const rows = computeChallengeRows(test, dataloggers, sensors, limits, isProtocol);
    return total + chunk(rows, ROWS_PER_PAGE).length;
  }, 0);
}
