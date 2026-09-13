export interface TocEntry {
  label: string;
  /** Stable id used to look up a computed page number at render time. */
  key?: string;
  page?: number; // static fallback for entries whose page never changes
  indent?: 0 | 1;
}

/** Mirrors the section structure of the reference template. Entries with a
 * `key` get their page number computed at render time from the actual,
 * dynamically-paginated report layout (see `buildReportPageMap` in
 * ReportPreview.tsx and the fixed protocol map below). Entries without a
 * `key`/`page` don't have a dedicated page of their own — they are covered
 * within an adjacent section's page and are intentionally left blank.
 */
export const TOC_ENTRIES: TocEntry[] = [
  { label: '1. Document Review and Approval', key: 'docReviewApproval' },
  { label: '2. Introduction', key: 'introduction' },
  { label: '2.1 Report Purpose', indent: 1 },
  { label: '2.2 Report Scope', indent: 1 },
  { label: '2.3 Signature Log', indent: 1 },
  { label: '2.4 Roles and Responsibilities', indent: 1 },
  { label: '3. System Brief Description', key: 'systemBrief' },
  { label: '4. Requirements', indent: 0, key: 'narrative' },
  { label: '5. Locations & Justification for Probe / Data Loggers', key: 'layoutPositions' },
  { label: '6. Procedures', indent: 0, key: 'narrative' },
  { label: '7. Acceptance Criteria', indent: 0, key: 'systemBrief' },
  { label: '8. Revalidation Frequency', indent: 0, key: 'narrative' },
  { label: '9. Result & Evaluation', indent: 0, key: 'narrative' },
  { label: '10. Summary & Conclusion', indent: 0, key: 'narrative' },
  { label: '11. Deviation', indent: 0, key: 'narrative' },
  { label: '12. References', indent: 0, key: 'narrative' },
  { label: '13. Test Results', key: 'testResults' },
  { label: '13.1 Stability Chamber Description', indent: 1, key: 'stabilityChamberDesc' },
  { label: '13.1.2 Layout & Datalogger Positions', indent: 1, key: 'layoutPositions' },
  { label: '13.1.3 Chamber Photos', indent: 1, key: 'chamberPhotos' },
  { label: '13.2 Test Data Sheet of Cycle', indent: 1, key: 'testDataSheet' },
  { label: 'Charts', indent: 1, key: 'charts' },
  { label: '14. Challenge Tests', key: 'challengeTests' },
  { label: '15. Calibration Section', key: 'calibrationSection' },
  { label: 'Appendix N.1 SOP Availability', key: 'sopAvailability' },
  { label: 'Appendix N.3 Signature Log', key: 'signatureLog' },
  { label: 'Appendix N.4 Addendum Form', key: 'addendum' },
  { label: 'Appendix N.5 Deviation Form', key: 'deviationForm' },
  { label: 'Appendix N.6 Attachments List', key: 'attachmentsList' },
  { label: 'Final Review and Approval', key: 'finalApproval' },
];

/** Fixed page numbers for Protocol mode, which always renders the same
 * 35-page structure regardless of report content. */
export const PROTOCOL_PAGE_MAP: Record<string, number> = {
  docReviewApproval: 3,
  introduction: 4,
  systemBrief: 7,
  narrative: 8,
  layoutPositions: 12,
  testResults: 7,
  stabilityChamberDesc: 9,
  chamberPhotos: 13,
  testDataSheet: 14,
  charts: 17,
  challengeTests: 20,
  calibrationSection: 26,
  sopAvailability: 29,
  signatureLog: 30,
  addendum: 31,
  deviationForm: 32,
  attachmentsList: 33,
  finalApproval: 34,
};
