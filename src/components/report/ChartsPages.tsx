import { Fragment } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';
import { ReportPageFrame } from './ReportPageFrame';
import type { SensorData, SensorReading } from '../../lib/analysis';
import type { DataloggerPosition } from '../../types/report';

const CHARTS_PER_PAGE = 2;
const MAX_POINTS_PER_CHART = 200;

function downsample(rows: SensorReading[], maxPoints: number): SensorReading[] {
  if (rows.length <= maxPoints) return rows;
  const step = Math.ceil(rows.length / maxPoints);
  const out: SensorReading[] = [];
  for (let i = 0; i < rows.length; i += step) out.push(rows[i]);
  const last = rows[rows.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function formatTick(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface ChartEntry {
  position: DataloggerPosition;
  sensor: SensorData;
}

function SensorChart({ entry }: { entry: ChartEntry }) {
  const points = downsample(entry.sensor.rows, MAX_POINTS_PER_CHART).map((r) => ({
    t: r.datetime,
    Temperature: r.temp,
    Humidity: r.humidity,
  }));

  return (
    <div className="mb-6">
      <h4 className="mb-1 text-[10px] font-semibold text-slate-600">
        Position {entry.position.positionNumber} — S/N {entry.position.serialNumber || entry.sensor.id}
      </h4>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={points} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="t" tickFormatter={formatTick} tick={{ fontSize: 8 }} minTickGap={40} />
            <YAxis yAxisId="temp" tick={{ fontSize: 8 }} width={28} />
            <YAxis yAxisId="hum" orientation="right" tick={{ fontSize: 8 }} width={28} />
            <Tooltip labelFormatter={(v) => formatTick(Number(v))} contentStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Line yAxisId="temp" type="monotone" dataKey="Temperature" stroke="#dc2626" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line yAxisId="hum" type="monotone" dataKey="Humidity" stroke="#2563eb" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChartsPages(props: { startPageNumber: number; totalPages: number }) {
  const { report } = useReport();
  const { sensors } = useAnalysis();
  if (!report) return null;
  const byId = new Map(sensors.map((s) => [s.id, s]));

  const entries: ChartEntry[] = report.chamberLayout.dataloggers
    .slice()
    .sort((a, b) => a.positionNumber - b.positionNumber)
    .map((position) => {
      const sensor = byId.get(position.serialNumber);
      return sensor && sensor.rows.length > 0 ? { position, sensor } : null;
    })
    .filter((e): e is ChartEntry => e !== null);

  const chunks = chunk(entries, CHARTS_PER_PAGE);

  return (
    <>
      {chunks.map((pageEntries, idx) => (
        <Fragment key={idx}>
          <ReportPageFrame pageNumber={props.startPageNumber + idx} totalPages={props.totalPages}>
            {idx === 0 && <h3 className="mb-4 text-xs font-bold text-slate-700">Charts</h3>}
            {pageEntries.length === 0 ? (
              <p className="text-[11px] italic text-slate-400">
                No chart data available yet — upload sensor CSVs and assign them to layout positions.
              </p>
            ) : (
              pageEntries.map((entry) => <SensorChart key={entry.position.id} entry={entry} />)
            )}
          </ReportPageFrame>
        </Fragment>
      ))}
    </>
  );
}

export function countChartsPages(dataloggers: DataloggerPosition[], sensors: SensorData[]): number {
  const byId = new Map(sensors.map((s) => [s.id, s]));
  const count = dataloggers.filter((d) => {
    const s = byId.get(d.serialNumber);
    return s && s.rows.length > 0;
  }).length;
  return chunk(new Array(count).fill(0), CHARTS_PER_PAGE).length;
}
