import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';
import { filterByRange, mktFor, statsFor } from '../../lib/analysis';
import { ReportPageFrame } from './ReportPageFrame';
import type { SensorData } from '../../lib/analysis';
import type { DataloggerPosition } from '../../types/report';

type ResultRow = {
  position: DataloggerPosition;
  sensor: SensorData;
  minTemp: number;
  maxTemp: number;
  minHum: number;
  maxHum: number;
  mkt: number;
};

function toEpoch(value: string): number | null {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isNaN(result) ? null : result;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '—';
}

function locationLabel(row: ResultRow | undefined): string {
  return row ? `Position ${row.position.positionNumber} (${row.sensor.id})` : 'Not available';
}

export function StudyResultsPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  const { sensors } = useAnalysis();
  if (!report) return null;

  const boundedSensors = filterByRange(
    sensors,
    toEpoch(report.studyPeriod.startDateTime),
    toEpoch(report.studyPeriod.endDateTime),
  );
  const byId = new Map(boundedSensors.map((sensor) => [sensor.id, sensor]));
  const rows: ResultRow[] = report.chamberLayout.dataloggers
    .map((position) => {
      const sensor = byId.get(position.serialNumber);
      if (!sensor || sensor.rows.length === 0) return null;
      const stats = statsFor(sensor);
      return {
        position,
        sensor,
        minTemp: stats.minTemp,
        maxTemp: stats.maxTemp,
        minHum: stats.minHum,
        maxHum: stats.maxHum,
        mkt: mktFor(sensor),
      };
    })
    .filter((row): row is ResultRow => row !== null)
    .sort((a, b) => a.position.positionNumber - b.position.positionNumber);

  const hottest = rows.reduce((best, row) => !best || row.maxTemp > best.maxTemp ? row : best, undefined as ResultRow | undefined);
  const coldest = rows.reduce((best, row) => !best || row.minTemp < best.minTemp ? row : best, undefined as ResultRow | undefined);
  const highestHumidity = rows.reduce((best, row) => !best || row.maxHum > best.maxHum ? row : best, undefined as ResultRow | undefined);
  const lowestHumidity = rows.reduce((best, row) => !best || row.minHum < best.minHum ? row : best, undefined as ResultRow | undefined);

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-1 text-sm font-bold text-slate-800">Study Results Summary</h2>
      <p className="mb-4 text-[9px] text-slate-500">
        Results calculated from readings within the entered study period
        {report.studyPeriod.startDateTime && report.studyPeriod.endDateTime
          ? ` (${report.studyPeriod.startDateTime.replace('T', ' ')} to ${report.studyPeriod.endDateTime.replace('T', ' ')})`
          : '.'}
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2 text-[9px]">
        <div className="rounded border border-slate-200 p-2"><span className="font-semibold">Hottest location:</span> {locationLabel(hottest)} — {formatNumber(hottest?.maxTemp ?? NaN)} °C</div>
        <div className="rounded border border-slate-200 p-2"><span className="font-semibold">Coldest location:</span> {locationLabel(coldest)} — {formatNumber(coldest?.minTemp ?? NaN)} °C</div>
        <div className="rounded border border-slate-200 p-2"><span className="font-semibold">Highest RH location:</span> {locationLabel(highestHumidity)} — {formatNumber(highestHumidity?.maxHum ?? NaN)} %RH</div>
        <div className="rounded border border-slate-200 p-2"><span className="font-semibold">Lowest RH location:</span> {locationLabel(lowestHumidity)} — {formatNumber(lowestHumidity?.minHum ?? NaN)} %RH</div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-4 text-[10px] text-amber-800">
          No sensor readings were found inside the selected study period.
        </p>
      ) : (
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              {['Position', 'Sensor S/N', 'Min T °C', 'Max T °C', 'Min RH %', 'Max RH %', 'MKT °C'].map((heading) => (
                <th key={heading} className="border border-slate-300 bg-slate-100 px-1.5 py-1.5 text-left font-semibold text-slate-600">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.position.id}>
                <td className="border border-slate-300 px-1.5 py-1">{row.position.positionNumber}</td>
                <td className="border border-slate-300 px-1.5 py-1">{row.sensor.id}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{formatNumber(row.minTemp)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{formatNumber(row.maxTemp)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{formatNumber(row.minHum)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{formatNumber(row.maxHum)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{formatNumber(row.mkt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportPageFrame>
  );
}
