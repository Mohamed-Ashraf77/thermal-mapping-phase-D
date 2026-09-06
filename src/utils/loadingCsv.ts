import type { LoadingItem } from '../types/report';
import { createId } from './id';

/** Splits a CSV line on commas, respecting simple double-quoted fields
 * (sufficient for the loading-description export: product names never
 * contain literal double quotes in the reference data).
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface LoadingCsvParseResult {
  items: LoadingItem[];
  skippedLines: number;
}

/** Parses a CSV export shaped like the reference template's Loading
 * Description table: Row Labels, Sum of Number of boxes, Box volume (mm3)[,
 * Volume per product (Liter)]. The last column is recalculated regardless
 * of whether it's present, so a 3-column export works too.
 */
export function parseLoadingCsv(text: string): LoadingCsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\uFEFF/, ''))
    .filter((l) => l.trim() !== '');

  if (lines.length === 0) return { items: [], skippedLines: 0 };

  // Skip a header row if the first cell isn't a usable product label
  // followed by two numeric-looking columns.
  let startIdx = 0;
  const firstCols = splitCsvLine(lines[0]);
  const looksLikeHeader =
    Number.isNaN(Number(firstCols[1])) || Number.isNaN(Number(firstCols[2]));
  if (looksLikeHeader) startIdx = 1;

  const items: LoadingItem[] = [];
  let skipped = 0;

  for (let i = startIdx; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    // Tolerate a leading "#" index column (as in the reference export) by
    // taking the last 3 non-empty columns as label/boxes/boxVolume.
    const usable = cols.filter((c) => c !== '');
    if (usable.length < 3) {
      skipped += 1;
      continue;
    }
    const boxVolumeMm3 = Number(usable[usable.length - 1]);
    const numberOfBoxes = Number(usable[usable.length - 2]);
    const rowLabel = usable.slice(0, usable.length - 2).join(' ').trim();

    if (!rowLabel || Number.isNaN(numberOfBoxes) || Number.isNaN(boxVolumeMm3)) {
      skipped += 1;
      continue;
    }

    items.push({
      id: createId('loading'),
      rowLabel,
      numberOfBoxes,
      boxVolumeMm3,
      volumePerProductLiters: (numberOfBoxes * boxVolumeMm3) / 1_000_000,
    });
  }

  return { items, skippedLines: skipped };
}

export function recalculateVolume(item: LoadingItem): number {
  return (item.numberOfBoxes * item.boxVolumeMm3) / 1_000_000;
}
