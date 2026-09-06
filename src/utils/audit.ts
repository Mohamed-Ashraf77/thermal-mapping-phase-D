import type { ReportDocument } from '../types/report';
import { createId } from './id';

const MAX_ENTRIES = 200;

/** Appends a timestamped action to the front of the audit log (most recent
 * first), trimmed to the last MAX_ENTRIES. Call inside a ReportContext
 * `update()` recipe, e.g.:
 *   update((r) => appendAuditEntry(r, 'Uploaded 3 CSV file(s)'));
 */
export function appendAuditEntry(report: ReportDocument, action: string): void {
  report.auditLog.unshift({ id: createId('audit'), timestamp: new Date().toISOString(), action });
  if (report.auditLog.length > MAX_ENTRIES) {
    report.auditLog.length = MAX_ENTRIES;
  }
}
