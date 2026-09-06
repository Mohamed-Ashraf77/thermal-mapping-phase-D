export interface TocEntry {
  label: string;
  page?: number; // filled in once the full report is paginated (Phase 6+)
  indent?: 0 | 1;
}

/** Mirrors the section structure of the reference template so the TOC reads
 * correctly even before every section is implemented. Entries without a
 * `page` render a dash — their position shifts with how much data-driven
 * content (loading rows, sensor count, challenge tests, calibration rows)
 * precedes them, so they'll be resolved automatically once the PDF assembly
 * engine (a later phase) lays out the full, paginated document.
 */
export const TOC_ENTRIES: TocEntry[] = [
  { label: '1. Document Review and Approval', page: 3 },
  { label: '2. Introduction', page: 4 },
  { label: '2.1 Report Purpose', indent: 1 },
  { label: '2.2 Report Scope', indent: 1 },
  { label: '2.3 Signature Log', indent: 1 },
  { label: '2.4 Roles and Responsibilities', indent: 1 },
  { label: '3. System Brief Description', page: 5 },
  { label: '4. Requirements', page: 6 },
  { label: '5. Locations & Justification for Probe / Data Loggers', page: 6 },
  { label: '6. Procedures', page: 6 },
  { label: '7. Acceptance Criteria', page: 5 },
  { label: '8. Revalidation Frequency', page: 6 },
  { label: '9. Result & Evaluation', page: 6 },
  { label: '10. Summary & Conclusion', page: 6 },
  { label: '11. Deviation', page: 6 },
  { label: '12. References', page: 6 },
  { label: '13. Test Results', page: 7 },
  { label: '13.1 Stability Chamber Description', indent: 1, page: 7 },
  { label: '13.1.2 Layout & Datalogger Positions', indent: 1 },
  { label: '13.1.3 Chamber Photos', indent: 1 },
  { label: '13.2 Test Data Sheet of Cycle', indent: 1 },
  { label: 'Charts', indent: 1 },
  { label: '14. Challenge Tests' },
  { label: '15. Calibration Section' },
  { label: 'Appendix N.1 SOP Availability' },
  { label: 'Appendix N.2 Critical Parameters Calibration List' },
  { label: 'Appendix N.3 Signature Log' },
  { label: 'Appendix N.4 Addendum Form' },
  { label: 'Appendix N.5 Deviation Form' },
  { label: 'Appendix N.6 Attachments List' },
  { label: 'Final Review and Approval' },
];
