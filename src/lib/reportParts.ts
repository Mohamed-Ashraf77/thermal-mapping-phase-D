/** Which printable parts of a report are included in a PDF export. */
export interface ReportParts {
  main: boolean;
  charts: boolean;
  calibration: boolean;
}

export const ALL_REPORT_PARTS: ReportParts = { main: true, charts: true, calibration: true };

export function parsePartsParam(value: string | null): ReportParts {
  if (!value) return ALL_REPORT_PARTS;
  const set = new Set(value.split(','));
  return { main: set.has('main'), charts: set.has('charts'), calibration: set.has('calibration') };
}

export function partsToParam(parts: ReportParts): string {
  return (Object.keys(parts) as (keyof ReportParts)[]).filter((k) => parts[k]).join(',');
}
