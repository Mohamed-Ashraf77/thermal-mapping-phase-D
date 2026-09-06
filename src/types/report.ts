// ---------------------------------------------------------------------------
// Core data model for the Thermal Mapping Report.
//
// This model is deliberately separate from the "analysis" data model
// (sensor readings, phases, excursions, etc.) that already exists in the
// application. It captures everything that appears in a finished GxP
// qualification report but is NOT derivable from the CSV data itself:
// document control fields, chamber description, loading, personnel,
// datalogger positions/photos, calibration records, and the narrative /
// approval sections.
//
// Phase 1 of the rebuild introduces this model plus the first two report
// pages (Cover Page + Document Review & Approval) that consume it.
// ---------------------------------------------------------------------------

/** A single named person/role entry used in approval & signature tables. */
export interface PersonEntry {
  id: string;
  name: string;
  title: string;
  company: string;
  date: string; // ISO date string (yyyy-mm-dd), formatted for display at render time
  signaturePresent: boolean; // true once the person has signed (wet or e-signature placeholder)
}

/** Document control / cover-page metadata. */
export interface DocumentInfo {
  reportTitle: string; // e.g. "Thermal Mapping Report"
  systemName: string; // e.g. "Long Term Walk-In Stability Chamber"
  systemCode: string; // e.g. "QC-STB-01"
  clientName: string; // e.g. "Utopia Pharmaceutical"
  clientSite: string; // e.g. "10th of Ramadan City"
  clientLogoDataUrl: string | null;
  performingCompanyName: string; // e.g. "TAG - Techno Air Gate"
  performingCompanyLogoDataUrl: string | null;
  documentNumber: string; // e.g. "THM-05924"
  revisionNumber: string; // e.g. "01"
  formReference: string; // e.g. "F-8.1.0/105"
  issueDate: string;
  contactAddressLines: string[];
  contactPhones: string[];
  contactEmail: string;
}

export type ApprovalGroup =
  | 'tagAuthors'
  | 'tagTesters'
  | 'tagReviewers'
  | 'clientReviewers'
  | 'approvers';

/** Document Review & Approval page (Section 1 of the template). */
export interface ApprovalSection {
  tagAuthors: PersonEntry[];
  tagTesters: PersonEntry[];
  tagReviewers: PersonEntry[];
  clientReviewers: PersonEntry[];
  approvers: PersonEntry[];
}

/** Introduction (Section 2 of the template). */
export interface IntroductionSection {
  purpose: string;
  scope: string;
}

/** Roles & Responsibilities entries (Section 2.4). */
export interface ResponsibilityItem {
  id: string;
  text: string;
}

export interface RolesResponsibilitiesSection {
  clientEngineeringValidation: ResponsibilityItem[];
  clientQuality: ResponsibilityItem[];
  performingCompany: ResponsibilityItem[];
}

/** System Brief Description (Section 3) + acceptance criteria. */
export interface AcceptanceCriteria {
  temperatureMinC: number;
  temperatureMaxC: number;
  humidityMinPct: number;
  humidityMaxPct: number;
}

export interface ChamberDescription {
  systemName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  innerSizeText: string; // e.g. "4800 w x 2500 D x 2500 H mm"
  code: string;
  location: string;
  acceptanceCriteria: AcceptanceCriteria;
  settingTemperatureC: number;
  settingHumidityPct: number;
  numberOfDataLoggers: number;
  loadingVolumeLiters: number;
  samplingPeriodHours: number;
  sampleFrequencyMinutes: number;
}

/** One row of the "Loading Description" table (Section 13.1.1). */
export interface LoadingItem {
  id: string;
  rowLabel: string;
  numberOfBoxes: number;
  boxVolumeMm3: number;
  volumePerProductLiters: number; // derived, but stored for CSV round-trip
}

/** A single datalogger placed in the chamber layout. */
export interface DataloggerPosition {
  id: string;
  positionNumber: number; // matches the "Sensor Position" number in the data table
  serialNumber: string; // matches sensor id used by the CSV analysis engine
  xPct: number; // 0-100, position on the layout image
  yPct: number; // 0-100, position on the layout image
  zone: 'left' | 'center' | 'right' | 'custom';
  note: string; // e.g. "Near door", "Top shelf, corner"
}

export interface ChamberLayout {
  layoutImageDataUrl: string | null; // uploaded/drawn floor plan or 3D sketch
  photos: { id: string; dataUrl: string; caption: string }[];
  dataloggers: DataloggerPosition[];
  airSupplyLabel: string;
  airReturnLabel: string;
  doorLabel: string;
}

/** The main-cycle recording window used to bound the Test Data Sheet
 * (Section 13.2) analysis. Challenge test windows are tracked separately
 * in `ChallengeTestMeta`.
 */
export interface StudyPeriod {
  startDateTime: string; // yyyy-MM-ddTHH:mm (datetime-local value)
  endDateTime: string;
}

/** Power Failure / Open Door challenge test metadata (narrative part only —
 * the numeric recovery analysis is computed by the existing analysis engine
 * from the CSV data for the phase window).
 */
export interface ChallengeTestMeta {
  id: string;
  type: 'powerFailure' | 'openDoor';
  date: string;
  startTime: string;
  endTime: string;
  plannedDurationMinutes: number;
}

/** Calibration record for one instrument/datalogger (Section 15). */
export interface CalibrationRecord {
  id: string;
  equipmentDescription: string; // e.g. "Data Logger"
  manufacturer: string; // e.g. "Log Tag"
  tagOrIdNumber: string; // serial number
  mostRecentCalibrationDate: string;
  calibrationDueDate: string;
  certificateFileName: string | null;
  certificateDataUrl: string | null; // stored client-side for later PDF merge
}

/** Revalidation / references / deviation narrative (Sections 4-12). */
export interface NarrativeSections {
  requirementsText: string;
  locationsJustificationText: string;
  proceduresText: string;
  revalidationFrequencyText: string;
  resultEvaluationText: string;
  summaryConclusionText: string;
  deviationText: string;
  references: string[];
}

/** Appendix N.1 - SOP availability. */
export interface SopAvailabilityItem {
  id: string;
  sopType: string;
  applicable: boolean;
  title: string;
  identificationNumber: string;
}

/** Appendix N.5 - Deviation form entries (if any deviations were raised). */
export interface DeviationEntry {
  id: string;
  deviationNumber: string;
  description: string;
  correctiveAction: string;
  personInCharge: string;
  expectedClosureDate: string;
  resolved: boolean;
}

export type FinalVerdict = 'positive' | 'passWithDeviation' | 'negative' | null;

export interface FinalApprovalSection {
  verdict: FinalVerdict;
  notes: string;
  approvers: PersonEntry[];
}

/** Attachment list entries (Appendix N.6). */
export interface AttachmentItem {
  id: string;
  description: string;
  numberOfPages: string; // free text: numeric or "CD" as in the sample template
}

/** A single audit-trail entry — who did what, when. Kept lightweight and
 * client-only; there's no login system in this tool, so "who" is just a
 * free-text label rather than an authenticated identity. */
export interface AuditEntry {
  id: string;
  timestamp: string; // ISO string
  action: string;
}

export type DocumentStatus =
  | 'draft'           // being edited — fully editable
  | 'under_review'    // submitted for QA review — editable by author, viewable by all
  | 'approved';       // final approval signed — LOCKED, read-only

/** The full report document model — everything a Report needs besides the
 * raw CSV-derived analysis (sensors/phases/stats), which is kept in the
 * existing analysis state.
 */
export interface ReportDocument {
  id: string;
  documentType: 'report' | 'protocol';
  createdAt: string;
  updatedAt: string;

  /** 21 CFR Part 11 — document lifecycle status */
  status: DocumentStatus;
  /** ISO timestamp when the document was locked (approved). */
  lockedAt: string | null;
  /** userId of the person who applied the final lock. */
  lockedBy: string | null;
  /** Display name of the locker — stored at lock time so it persists even if
   *  the user record is later modified. */
  lockedByDisplayName: string | null;

  documentInfo: DocumentInfo;
  approval: ApprovalSection;
  introduction: IntroductionSection;
  rolesResponsibilities: RolesResponsibilitiesSection;
  chamberDescription: ChamberDescription;
  loadingItems: LoadingItem[];
  chamberLayout: ChamberLayout;
  studyPeriod: StudyPeriod;
  challengeTests: ChallengeTestMeta[];
  calibrationRecords: CalibrationRecord[];
  narrative: NarrativeSections;
  sopAvailability: SopAvailabilityItem[];
  deviations: DeviationEntry[];
  finalApproval: FinalApprovalSection;
  attachments: AttachmentItem[];
  auditLog: AuditEntry[];
}
