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
   * without extension, expected to match a datalogger's serial number.
   * For Multicon files each channel gets its own id: "<base>_A<n>". */
  id: string;
  rows: SensorReading[];
  error?: string;
  /** Which device format was detected for this file. */
  format?: 'logtag' | 'tempnote' | 'multicon' | 'unknown';
  /** False for temperature-only dataloggers (e.g. Multicon oven/chamber
   * probes) that have no real humidity channel. When false, `humidity` on
   * each reading is a meaningless placeholder (0) and must be excluded from
   * all humidity stats, pass/fail checks, and "worst RH location" summaries. */
  hasHumidity?: boolean;
}

export interface SensorStats {
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  /** null when the sensor has no real humidity channel (see SensorData.hasHumidity). */
  maxHum: number | null;
  minHum: number | null;
  avgHum: number | null;
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

/** Parses a date string in either "M/D/YY(YY)" or "YYYY-MM-DD" form, plus an
 * "H:MM(:SS)" time string, into epoch ms — or null if neither date format
 * nor the time format match (LogTag/TempNote exports have been observed
 * using both date styles depending on device locale/firmware settings). */
export function parseDateTime(dateStr: string, timeStr: string): number | null {
  let month: number;
  let day: number;
  let year: number;

  const slash = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  const iso = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (slash) {
    month = parseInt(slash[1], 10);
    day = parseInt(slash[2], 10);
    year = parseInt(slash[3], 10);
    if (year < 100) year += 2000;
  } else if (iso) {
    year = parseInt(iso[1], 10);
    month = parseInt(iso[2], 10);
    day = parseInt(iso[3], 10);
  } else {
    return null;
  }

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

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

export type DeviceFormat = 'logtag' | 'tempnote' | 'multicon' | 'unknown';

/**
 * Detects which device format produced the CSV text.
 *
 * Rules (checked in order):
 *  1. Multicon  — first non-empty line starts with "No." and header
 *                 contains "Date and time" and "Inp."
 *  2. TempNote  — text contains "Device Type:" or "Tempnote" or
 *                 a line matching "Date,Time,Temperature(C)"
 *  3. LogTag    — first non-empty line starts with a number (index),
 *                 then a date in MM/DD/YYYY format
 *  4. unknown   — anything else (will fall back to the original LogTag parser)
 */
export function detectFormat(text: string): DeviceFormat {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLines = clean.split(/\r?\n/).slice(0, 5).map((l) => l.trim());

  // Multicon: header has "No." + "Date and time" + "Inp."
  const header0 = firstLines[0] || '';
  if (
    /^No\./i.test(header0) &&
    /Date and time/i.test(header0) &&
    /Inp\./i.test(header0)
  ) {
    return 'multicon';
  }

  // TempNote: metadata block present
  if (
    /Device Type:/i.test(clean) ||
    /Tempnote/i.test(clean) ||
    /Temperature\(C\)/i.test(clean)
  ) {
    return 'tempnote';
  }

  // LogTag: first data line is  <number>,<date>,<HH:MM:SS>,...
  // Date can be MM/DD/YYYY or YYYY-MM-DD depending on device/firmware locale.
  const firstData = firstLines.find((l) => l.length > 0) || '';
  if (/^\d+,(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2}),\d{2}:\d{2}:\d{2}/.test(firstData)) {
    return 'logtag';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// LogTag parser
// ---------------------------------------------------------------------------

/**
 * LogTag CSV: no header, every line is data.
 * Columns: index, date (MM/DD/YYYY or YYYY-MM-DD), HH:MM:SS, temperature, humidity [, optional note]
 *
 * Example:
 *   1,09/08/2026,15:36:48,25.1,68.1,
 *   4,09/08/2026,15:42:48,24.2,73.6, Inspection Mark
 *   1,2026-08-09,15:36:48,25.1,68.1,
 */
function parseLogTagCsv(id: string, lines: string[]): SensorData {
  const rows: SensorReading[] = [];

  for (const raw of lines) {
    const clean = raw.replace(/^\uFEFF/, '');
    if (clean.trim() === '') continue;
    const parts = clean.split(',');
    // Expect at least 5 columns: index, date, time, temp, humidity
    if (parts.length < 5) continue;

    const dateStr = (parts[1] || '').trim();
    const timeStr = (parts[2] || '').trim();
    const tempStr = (parts[3] || '').trim();
    const humStr  = (parts[4] || '').trim();

    if (!dateStr || !timeStr || tempStr === '' || humStr === '') continue;

    const dt = parseDateTime(dateStr, timeStr);
    if (dt === null) continue;
    const temp = parseFloat(tempStr);
    const humidity = parseFloat(humStr);
    if (Number.isNaN(temp) || Number.isNaN(humidity)) continue;

    rows.push({ datetime: dt, temp, humidity });
  }

  if (rows.length === 0) {
    return { id, rows: [], error: 'LogTag: no valid data rows found.', format: 'logtag' };
  }
  rows.sort((a, b) => a.datetime - b.datetime);
  return { id, rows, format: 'logtag' };
}

// ---------------------------------------------------------------------------
// TempNote parser
// ---------------------------------------------------------------------------

/**
 * TempNote CSV: long metadata header, then a data section starting with:
 *   Date,Time,Temperature(C),Humidity(%RH)
 *   ******...
 *   MM/DD/YYYY, HH:MM:SS, temp, hum
 *
 * The parser skips everything before the "Date,Time,..." header row and
 * the optional "***..." separator that follows it.
 */
function parseTempNoteCsv(id: string, lines: string[]): SensorData {
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].replace(/^\uFEFF/, '').trim();
    if (/^date,\s*time/i.test(trimmed)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    return { id, rows: [], error: 'TempNote: data header row not found.', format: 'tempnote' };
  }

  let dataStart = headerIdx + 1;
  // Skip optional *** separator line
  if (dataStart < lines.length && /^\*+/.test(lines[dataStart].trim())) {
    dataStart += 1;
  }

  const rows: SensorReading[] = [];
  for (let j = dataStart; j < lines.length; j++) {
    const raw = lines[j].replace(/^\uFEFF/, '');
    if (raw.trim() === '') continue;
    const parts = raw.split(',');
    if (parts.length < 4) continue;

    const dateStr = (parts[0] || '').trim();
    const timeStr = (parts[1] || '').trim();
    const tempStr = (parts[2] || '').trim();
    const humStr  = (parts[3] || '').trim();

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
    return { id, rows: [], error: 'TempNote: no valid data rows found after header.', format: 'tempnote' };
  }
  rows.sort((a, b) => a.datetime - b.datetime);
  return { id, rows, format: 'tempnote' };
}

// ---------------------------------------------------------------------------
// Multicon parser
// ---------------------------------------------------------------------------

/**
 * Extracts the recording start datetime from a Multicon filename.
 *
 * Expected pattern anywhere in the filename:
 *   YYYYMMDD_HHmmSS   (e.g. 20260901_120100)
 *
 * Returns epoch ms, or null if the pattern is not found.
 */
function extractMulticonStartTime(fileName: string): number | null {
  // Match YYYYMMDD_HHmmSS — 8 digits, underscore, 6 digits
  const m = fileName.match(/(\d{8})_(\d{6})/);
  if (!m) return null;

  const dateStr = m[1]; // YYYYMMDD
  const timeStr = m[2]; // HHmmSS

  const year   = parseInt(dateStr.slice(0, 4), 10);
  const month  = parseInt(dateStr.slice(4, 6), 10) - 1; // 0-indexed
  const day    = parseInt(dateStr.slice(6, 8), 10);
  const hour   = parseInt(timeStr.slice(0, 2), 10);
  const minute = parseInt(timeStr.slice(2, 4), 10);
  const second = parseInt(timeStr.slice(4, 6), 10);

  const dt = new Date(year, month, day, hour, minute, second);
  return isNaN(dt.getTime()) ? null : dt.getTime();
}

/**
 * Parses the Multicon "Date and time" cell.
 *
 * Two known variants exist depending on export settings:
 *   1. Absolute timestamp: "YYYY-MM-DD HH:MM:SS.s" e.g. "2026-09-01 12:41:08.4"
 *   2. Elapsed time since recording start:
 *        MM:SS.s      e.g. "41:08.4"   → 41 min 8.4 s
 *        HH:MM:SS     e.g. "01:30:00"  → 1 h 30 min 0 s (three colon-parts)
 *
 * Returns `{ absoluteMs }` when the cell is a full timestamp, or
 * `{ elapsedMs }` when it's an elapsed duration, or null on parse failure.
 */
function parseMulticonDateTimeCell(cell: string): { absoluteMs: number } | { elapsedMs: number } | null {
  const c = cell.trim();

  // Absolute timestamp: "YYYY-MM-DD HH:MM:SS[.s]"
  const abs = c.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (abs) {
    const year = parseInt(abs[1], 10);
    const month = parseInt(abs[2], 10) - 1;
    const day = parseInt(abs[3], 10);
    const hour = parseInt(abs[4], 10);
    const minute = parseInt(abs[5], 10);
    const secFloat = parseFloat(abs[6]);
    const sec = Math.floor(secFloat);
    const ms = Math.round((secFloat - sec) * 1000);
    const dt = new Date(year, month, day, hour, minute, sec, ms);
    return isNaN(dt.getTime()) ? null : { absoluteMs: dt.getTime() };
  }

  // Three-part elapsed: HH:MM:SS or HH:MM:SS.s
  const three = c.match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (three) {
    const h = parseInt(three[1], 10);
    const m = parseInt(three[2], 10);
    const s = parseFloat(three[3]);
    return { elapsedMs: (h * 3600 + m * 60 + s) * 1000 };
  }

  // Two-part elapsed: MM:SS or MM:SS.s (the common Multicon format)
  const two = c.match(/^(\d+):(\d{2}(?:\.\d+)?)$/);
  if (two) {
    const m = parseInt(two[1], 10);
    const s = parseFloat(two[2]);
    return { elapsedMs: (m * 60 + s) * 1000 };
  }

  return null;
}

/**
 * Multicon CSV: one header row, then N data rows.
 * Columns: No., "Date and time", Inp.A1[°C], Inp.A2[°C], ..., Inp.AN[°C]
 *
 * Produces one SensorData per channel. Channel count is dynamic — whatever
 * the header says is present will be parsed. Humidity is set to 0 because
 * Multicon records temperature only.
 *
 * The real start datetime is extracted from the filename using
 * extractMulticonStartTime(). If the filename doesn't contain a timestamp
 * the rows will still be produced but with relative epoch offsets from 0
 * (and a warning in the error field of the first channel).
 *
 * @returns Array of SensorData — one per channel found in the header.
 */
function parseMulticonCsv(fileName: string, lines: string[]): SensorData[] {
  const baseName = fileName.replace(/\.csv$/i, '');

  // Find the header line (first non-empty line starting with "No.")
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].replace(/^\uFEFF/, '').trim();
    if (/^No\./i.test(trimmed)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return [{
      id: baseName,
      rows: [],
      error: 'Multicon: header row (No., Date and time, ...) not found.',
      format: 'multicon',
    }];
  }

  // Parse header to find channel names and their column indices
  const headerParts = lines[headerIdx]
    .replace(/^\uFEFF/, '')
    .split(',')
    .map((p) => p.trim());

  // Channels are all columns after "No." (col 0) and "Date and time" (col 1)
  // They may be labeled "Inp. A1  [°C] (1)" or similar — extract the channel
  // label as-is for the id suffix.
  interface ChannelDef {
    colIdx: number;   // column index in the CSV row
    label: string;    // e.g. "A1", "A2", … derived from header cell
  }

  const channels: ChannelDef[] = [];
  for (let c = 2; c < headerParts.length; c++) {
    const cell = headerParts[c];
    if (!cell) continue;
    // Try to extract "A<n>" from patterns like "Inp. A1  [°C] (1)" or "A2"
    const labelMatch = cell.match(/A(\d+)/i);
    const label = labelMatch ? `A${labelMatch[1]}` : `CH${c - 1}`;
    channels.push({ colIdx: c, label });
  }

  if (channels.length === 0) {
    return [{
      id: baseName,
      rows: [],
      error: 'Multicon: no channel columns found in header.',
      format: 'multicon',
    }];
  }

  // Extract start time from filename — used only as a fallback when the
  // "Date and time" column contains elapsed durations instead of absolute
  // timestamps (some Multicon export profiles use elapsed time).
  const startMs = extractMulticonStartTime(fileName);
  const noTimestamp = startMs === null;
  let usedAbsoluteTimestamps = false;

  // Build a rows array per channel
  const channelRows: SensorReading[][] = channels.map(() => []);

  for (let j = headerIdx + 1; j < lines.length; j++) {
    const raw = lines[j].replace(/^\uFEFF/, '');
    if (raw.trim() === '') continue;
    const parts = raw.split(',');
    if (parts.length < 3) continue;

    // Column 1 is either an absolute timestamp or an elapsed duration
    const parsed = parseMulticonDateTimeCell(parts[1] || '');
    if (parsed === null) continue;

    let absoluteMs: number;
    if ('absoluteMs' in parsed) {
      usedAbsoluteTimestamps = true;
      absoluteMs = parsed.absoluteMs;
    } else {
      absoluteMs = noTimestamp ? parsed.elapsedMs : startMs! + parsed.elapsedMs;
    }

    for (let ch = 0; ch < channels.length; ch++) {
      const { colIdx } = channels[ch];
      const tempStr = (parts[colIdx] || '').trim();
      if (tempStr === '') continue;
      const temp = parseFloat(tempStr);
      if (Number.isNaN(temp)) continue;
      channelRows[ch].push({ datetime: absoluteMs, temp, humidity: 0 });
    }
  }

  // Build one SensorData per channel
  return channels.map((ch, idx) => {
    const rows = channelRows[idx];
    rows.sort((a, b) => a.datetime - b.datetime);
    const sensorId = `${baseName}_${ch.label}`;
    const base: SensorData = {
      id: sensorId,
      rows,
      format: 'multicon',
      hasHumidity: false,
    };
    if (rows.length === 0) {
      base.error = `Multicon channel ${ch.label}: no valid data rows.`;
    }
    if (noTimestamp && !usedAbsoluteTimestamps) {
      base.error = (base.error ? base.error + ' ' : '') +
        'Warning: start datetime not found in filename — timestamps are relative to recording start.';
    }
    return base;
  });
}

/** Parses one datalogger CSV export into sorted sensor readings. Throws a
 * descriptive Error on unrecoverable format problems (no header found, no
 * valid rows) so the caller can surface it per-file.
 */
// ---------------------------------------------------------------------------
// Public entry point — auto-detects format and dispatches
// ---------------------------------------------------------------------------

/**
 * Parses one datalogger CSV export into one or more SensorData objects.
 *
 * • LogTag / TempNote → returns a single-element array.
 * • Multicon          → returns one element per channel (N ≥ 1).
 * • Unknown format    → falls back to the original LogTag-style parser
 *                       for backwards compatibility.
 *
 * Replaces the old single-return `parseSensorCsv()`. The AnalysisContext
 * should call this and spread the returned array into its sensor list.
 */
export function parseSensorCsvMulti(fileName: string, text: string): SensorData[] {
  const format = detectFormat(text);
  const lines = text.split(/\r?\n/);
  const baseName = fileName.replace(/\.csv$/i, '');

  switch (format) {
    case 'logtag':
      return [parseLogTagCsv(baseName, lines)];

    case 'tempnote':
      return [parseTempNoteCsv(baseName, lines)];

    case 'multicon':
      return parseMulticonCsv(fileName, lines);

    default:
      // Unknown: try original LogTag-style parser as fallback
      return [parseLogTagCsv(baseName, lines)];
  }
}

/**
 * Single-sensor convenience wrapper — kept for backward compatibility with
 * any existing code that calls `parseSensorCsv(fileName, text)`.
 *
 * For Multicon files this returns only the FIRST channel. Prefer
 * `parseSensorCsvMulti` in new code so all channels are captured.
 */
export function parseSensorCsv(fileName: string, text: string): SensorData {
  const results = parseSensorCsvMulti(fileName, text);
  return results[0];
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function statsFor(sensor: SensorData): SensorStats {
  const n = sensor.rows.length;
  const hasHumidity = sensor.hasHumidity !== false;
  let tSum = 0;
  let hSum = 0;
  let tMax = -Infinity;
  let tMin = Infinity;
  let hMax = -Infinity;
  let hMin = Infinity;
  for (let i = 0; i < n; i += 1) {
    const { temp: t, humidity: h } = sensor.rows[i];
    tSum += t;
    if (t > tMax) tMax = t;
    if (t < tMin) tMin = t;
    if (hasHumidity) {
      hSum += h;
      if (h > hMax) hMax = h;
      if (h < hMin) hMin = h;
    }
  }
  return {
    maxTemp: tMax,
    minTemp: tMin,
    avgTemp: n ? tSum / n : NaN,
    maxHum: hasHumidity ? hMax : null,
    minHum: hasHumidity ? hMin : null,
    avgHum: hasHumidity && n ? hSum / n : null,
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
    return { id: s.id, rows, error: undefined, format: s.format, hasHumidity: s.hasHumidity };
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
