// ---------------------------------------------------------------------------
// Datalogger CSV analysis engine.
//
// Ported from `legacy-reference/original-single-file-app.html`, which was
// battle-tested against real LogTag-style exports. The parsing and math are
// kept behaviourally identical (same date format assumptions, same MKT
// constants, same excursion/recovery algorithm) — only reorganized into
// typed, testable functions with no DOM dependency.
// ---------------------------------------------------------------------------

export interface SensorReading {
  /** Epoch milliseconds. */
  datetime: number;
  temp: number;
  humidity: number;
}

export interface SensorData {
  /** Stable identifier for the sensor — by convention the CSV file name
   * without extension, expected to match a datalogger's serial number. */
  id: string;
  rows: SensorReading[];
  error?: string;
}

export interface SensorStats {
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  maxHum: number;
  minHum: number;
  avgHum: number;
  count: number;
}

export interface Limits {
  lowerTempC: number;
  upperTempC: number;
  lowerHumPct: number;
  upperHumPct: number;
}

export interface ExcursionResult {
  tCount: number;
  hCount: number;
  tDurationMinutes: number;
  hDurationMinutes: number;
}

export interface RecoveryResult {
  outOfSpec: boolean;
  excursionDurationMinutes: number;
  /** null means the parameter never returned within range before the data ended. */
  recoveryMinutes: number | null;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Parses a "M/D/YY(YY)" date + "H:MM(:SS)" time pair into epoch ms, or null
 * if either doesn't match the expected LogTag-style format. */
export function parseDateTime(dateStr: string, timeStr: string): number | null {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;

  let t = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!t) {
    t = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!t) return null;
  }
  const hh = parseInt(t[1], 10);
  const mm = parseInt(t[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hh > 23 || mm > 59) return null;
  return new Date(year, month - 1, day, hh, mm, 0).getTime();
}

/** Parses one datalogger CSV export into sorted sensor readings. Throws a
 * descriptive Error on unrecoverable format problems (no header found, no
 * valid rows) so the caller can surface it per-file.
 */
export function parseSensorCsv(fileName: string, text: string): SensorData {
  const id = fileName.replace(/\.csv$/i, '');
  const lines = text.split(/\r?\n/);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].replace(/^\uFEFF/, '').trim();
    if (/^date,/i.test(trimmed) || trimmed.toLowerCase() === 'date,time,temperature(c),humidity(%rh)') {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { id, rows: [], error: "Header row starting with 'Date' not found." };
  }

  let dataStart = headerIdx + 1;
  if (dataStart < lines.length && /^\*+/.test(lines[dataStart].trim())) {
    dataStart += 1;
  }

  const rows: SensorReading[] = [];
  for (let j = dataStart; j < lines.length; j += 1) {
    const raw = lines[j].replace(/^\uFEFF/, '');
    if (raw.trim() === '') continue;
    const parts = raw.split(',');
    if (parts.length < 4) continue;
    const dateStr = (parts[0] || '').trim();
    const timeStr = (parts[1] || '').trim();
    const tempStr = (parts[2] || '').trim();
    const humStr = (parts[3] || '').trim();
    if (!dateStr || !timeStr || tempStr === '' || humStr === '') continue;
    if (/^\*+/.test(dateStr)) continue;

    const dt = parseDateTime(dateStr, timeStr);
    if (dt === null) continue;
    const temp = parseFloat(tempStr);
    const humidity = parseFloat(humStr);
    if (Number.isNaN(temp) || Number.isNaN(humidity)) continue;

    rows.push({ datetime: dt, temp, humidity });
  }

  if (rows.length === 0) {
    return { id, rows: [], error: 'No valid data rows found after header.' };
  }
  rows.sort((a, b) => a.datetime - b.datetime);
  return { id, rows };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function statsFor(sensor: SensorData): SensorStats {
  const n = sensor.rows.length;
  let tSum = 0;
  let hSum = 0;
  let tMax = -Infinity;
  let tMin = Infinity;
  let hMax = -Infinity;
  let hMin = Infinity;
  for (let i = 0; i < n; i += 1) {
    const { temp: t, humidity: h } = sensor.rows[i];
    tSum += t;
    hSum += h;
    if (t > tMax) tMax = t;
    if (t < tMin) tMin = t;
    if (h > hMax) hMax = h;
    if (h < hMin) hMin = h;
  }
  return {
    maxTemp: tMax,
    minTemp: tMin,
    avgTemp: n ? tSum / n : NaN,
    maxHum: hMax,
    minHum: hMin,
    avgHum: n ? hSum / n : NaN,
    count: n,
  };
}

const MKT_DH = 83.144; // kJ/mol
const MKT_R = 0.0083144; // kJ/mol·K

/** Mean Kinetic Temperature in °C. */
export function mktFor(sensor: SensorData): number {
  const n = sensor.rows.length;
  if (n === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const tk = sensor.rows[i].temp + 273.15;
    sum += Math.exp(-MKT_DH / (MKT_R * tk));
  }
  const avg = sum / n;
  if (avg <= 0) return NaN;
  const mktK = MKT_DH / MKT_R / -Math.log(avg);
  return mktK - 273.15;
}

/** Excursion count/duration, computed on data binned to `binMinutes` to
 * match the reference tool's behaviour (avoids over-counting excursions
 * from very high sample-rate loggers). */
export function excursionsFor(sensor: SensorData, limits: Limits, binMinutes: number): ExcursionResult {
  const bin = binMinutes || 1;
  const binMs = bin * 60 * 1000;

  const bins = new Map<number, { tSum: number; hSum: number; count: number }>();
  sensor.rows.forEach((r) => {
    const binTs = Math.floor(r.datetime / binMs) * binMs;
    const agg = bins.get(binTs);
    if (agg) {
      agg.tSum += r.temp;
      agg.hSum += r.humidity;
      agg.count += 1;
    } else {
      bins.set(binTs, { tSum: r.temp, hSum: r.humidity, count: 1 });
    }
  });

  let tCount = 0;
  let hCount = 0;
  bins.forEach((agg) => {
    const t = agg.tSum / agg.count;
    const h = agg.hSum / agg.count;
    if (t < limits.lowerTempC || t > limits.upperTempC) tCount += 1;
    if (h < limits.lowerHumPct || h > limits.upperHumPct) hCount += 1;
  });

  return {
    tCount,
    hCount,
    tDurationMinutes: tCount * bin,
    hDurationMinutes: hCount * bin,
  };
}

// ---------------------------------------------------------------------------
// Challenge test recovery analysis
// ---------------------------------------------------------------------------

/** Finds whether a series goes out of [lower, upper] and, if so, the total
 * excursion duration and the time to recover after the worst deviation.
 * `recoveryMinutes` is null if the series never returns to range.
 */
export function computeRecoveryMetric(
  rows: SensorReading[],
  getValue: (r: SensorReading) => number,
  lowerLimit: number,
  upperLimit: number,
): RecoveryResult {
  if (!rows.length || Number.isNaN(lowerLimit) || Number.isNaN(upperLimit)) {
    return { outOfSpec: false, excursionDurationMinutes: 0, recoveryMinutes: null };
  }
  const oosIdx: number[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const v = getValue(rows[i]);
    if (v < lowerLimit || v > upperLimit) oosIdx.push(i);
  }
  if (!oosIdx.length) return { outOfSpec: false, excursionDurationMinutes: 0, recoveryMinutes: 0 };

  let excursionMin = 0;
  let i = 0;
  while (i < oosIdx.length) {
    const runStart = oosIdx[i];
    let runEnd = oosIdx[i];
    while (i + 1 < oosIdx.length && oosIdx[i + 1] === oosIdx[i] + 1) {
      i += 1;
      runEnd = oosIdx[i];
    }
    let dur: number;
    if (runEnd === runStart) {
      const next = runEnd + 1 < rows.length ? rows[runEnd + 1].datetime : rows[runEnd].datetime + 60000;
      const prev = runStart > 0 ? rows[runStart - 1].datetime : rows[runStart].datetime;
      dur = (next - prev) / 120000;
    } else {
      dur = (rows[runEnd].datetime - rows[runStart].datetime) / 60000;
      if (runStart > 0) dur += (rows[runStart].datetime - rows[runStart - 1].datetime) / 120000;
      if (runEnd + 1 < rows.length) dur += (rows[runEnd + 1].datetime - rows[runEnd].datetime) / 120000;
    }
    excursionMin += dur;
    i += 1;
  }

  let peakIdx = oosIdx[0];
  let peakDev = -Infinity;
  for (let j = 0; j < oosIdx.length; j += 1) {
    const v = getValue(rows[oosIdx[j]]);
    const dev = v > upperLimit ? v - upperLimit : lowerLimit - v;
    if (dev > peakDev) {
      peakDev = dev;
      peakIdx = oosIdx[j];
    }
  }

  let lastOosAfterPeak = peakIdx;
  for (let k = peakIdx; k < rows.length; k += 1) {
    const v = getValue(rows[k]);
    if (v < lowerLimit || v > upperLimit) lastOosAfterPeak = k;
  }

  let recoveryMinutes: number | null = null;
  if (lastOosAfterPeak + 1 < rows.length) {
    recoveryMinutes = (rows[lastOosAfterPeak + 1].datetime - rows[peakIdx].datetime) / 60000;
  }

  return { outOfSpec: true, excursionDurationMinutes: excursionMin, recoveryMinutes };
}

// ---------------------------------------------------------------------------
// Phase filtering helpers
// ---------------------------------------------------------------------------

export function filterByRange(sensors: SensorData[], startMs: number | null, endMs: number | null): SensorData[] {
  if (startMs === null && endMs === null) return sensors;
  return sensors.map((s) => {
    if (s.error || s.rows.length === 0) return s;
    const rows = s.rows.filter((r) => {
      if (startMs !== null && r.datetime < startMs) return false;
      if (endMs !== null && r.datetime > endMs) return false;
      return true;
    });
    return { id: s.id, rows, error: undefined };
  });
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.round(minutes % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}
