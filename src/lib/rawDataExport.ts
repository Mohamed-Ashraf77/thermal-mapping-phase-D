import type { SensorData } from './analysis';
import type { DataloggerPosition } from '../types/report';

export interface CombinedDataOptions {
  /** Bin size in minutes used to align readings from different loggers
   * that may not share identical timestamps. Defaults to 2 minutes to
   * match the reference template's standard sample frequency. */
  binMinutes?: number;
}

export interface CombinedColumn {
  positionNumber: number | null;
  serialNumber: string;
}

export interface CombinedDataTable {
  columns: CombinedColumn[];
  /** One row per time bin: [epochMs, ...values] where values alternate
   * temp/humidity per column, using null for missing readings. */
  rows: { timestamp: number; values: (number | null)[] }[];
}

/** Merges every uploaded sensor's readings into a single time-indexed
 * table, ordered by datalogger position number when available (falling
 * back to upload order for sensors with no matching layout position).
 */
export function buildCombinedDataTable(
  sensors: SensorData[],
  dataloggers: DataloggerPosition[],
  options: CombinedDataOptions = {},
): CombinedDataTable {
  const binMs = (options.binMinutes ?? 2) * 60 * 1000;
  const posBySerial = new Map(dataloggers.map((d) => [d.serialNumber, d.positionNumber]));

  const ordered = sensors
    .slice()
    .sort((a, b) => (posBySerial.get(a.id) ?? Infinity) - (posBySerial.get(b.id) ?? Infinity));

  const columns: CombinedColumn[] = ordered.map((s) => ({
    positionNumber: posBySerial.get(s.id) ?? null,
    serialNumber: s.id,
  }));

  // binTimestamp -> per-column [temp, hum]
  const bins = new Map<number, (number | null)[]>();

  ordered.forEach((sensor, colIdx) => {
    sensor.rows.forEach((r) => {
      const binTs = Math.round(r.datetime / binMs) * binMs;
      let row = bins.get(binTs);
      if (!row) {
        row = new Array(columns.length * 2).fill(null);
        bins.set(binTs, row);
      }
      row[colIdx * 2] = r.temp;
      row[colIdx * 2 + 1] = r.humidity;
    });
  });

  const rows = Array.from(bins.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, values]) => ({ timestamp, values }));

  return { columns, rows };
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Serializes a CombinedDataTable to CSV text: one "Date/Time" column
 * followed by "<Serial> T(°C)" / "<Serial> RH(%)" column pairs per sensor.
 */
export function combinedTableToCsv(table: CombinedDataTable): string {
  const header = [
    'Date/Time',
    ...table.columns.flatMap((c) => [
      `${c.serialNumber || `Pos ${c.positionNumber ?? '?'}`} T(°C)`,
      `${c.serialNumber || `Pos ${c.positionNumber ?? '?'}`} RH(%)`,
    ]),
  ];
  const lines = [header.join(',')];
  table.rows.forEach((row) => {
    const cells = [formatTimestamp(row.timestamp), ...row.values.map((v) => (v === null ? '' : v.toString()))];
    lines.push(cells.join(','));
  });
  return lines.join('\r\n');
}

/** Triggers a browser download of the given text as a file. */
export function downloadTextFile(filename: string, text: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
