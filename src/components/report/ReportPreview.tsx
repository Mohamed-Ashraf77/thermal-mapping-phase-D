import { CoverPage } from './CoverPage';
import { TableOfContentsPage } from './TableOfContentsPage';
import { ApprovalPage } from './ApprovalPage';
import {
  IntroductionPage,
  ProtocolExecutionInstructionsPage,
  ProtocolRolesPage,
} from './IntroductionPage';
import { SystemBriefDescriptionPage } from './SystemBriefDescriptionPage';
import { NarrativePage } from './NarrativePage';
import { StabilityChamberDescriptionPage } from './StabilityChamberDescriptionPage';
import { LoadingDescriptionPages, chunkLoadingItems } from './LoadingDescriptionPages';
import { ChamberLayoutPage, ChamberPhotosPage } from './ChamberLayoutPage';
import { TestDataSheetPages, chunkTestDataRows } from './TestDataSheetPages';
import { ChartsPages, countChartsPages } from './ChartsPages';
import { StudyResultsPage } from './StudyResultsPage';
import { ChallengeTestPages, countChallengeTestPages } from './ChallengeTestPages';
import { CalibrationPages, countCalibrationPages } from './CalibrationPage';
import { ReportPageFrame } from './ReportPageFrame';
import {
  SopAvailabilityPage,
  AttachmentsListPage,
  DeviationsPage,
  FinalApprovalPage,
  AddendumPage,
  FinalApprovalSecondPage,
} from './AppendicesPages';
import {
  CriticalParametersCalibrationPage,
  SignatureLogPage,
} from './SignatureLogAndAuditPages';
import { useReport } from '../../store/ReportContext';
import { useAnalysis } from '../../store/AnalysisContext';

// Placeholders for Protocol mode charts and worst-points layout
function ChartsPlaceholderPage({ pageNumber, totalPages, title }: { pageNumber: number; totalPages: number; title: string }) {
  return (
    <ReportPageFrame pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">{title}</h2>
      <div className="border border-slate-300 rounded-lg p-10 text-center text-slate-400 mt-20">
        <p className="font-semibold text-slate-600 mb-2">CHARTS ATTACHMENT PLACEHOLDER</p>
        <p className="text-xs">No. of attached Pages: --</p>
      </div>
    </ReportPageFrame>
  );
}

function WorstPointsLayoutPage({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  return (
    <ReportPageFrame pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="mb-1 text-sm font-bold text-slate-800">13.2.5 Stability Chamber (Full Load) Layout & Distribution of Data Loggers with worst points</h2>
      <p className="mb-4 text-[9px] text-slate-500 italic">Layout showing dataloggers with worst points (Hand-written on site)</p>
      {report.chamberLayout.layoutImageDataUrl ? (
        <img src={report.chamberLayout.layoutImageDataUrl} alt="worst points layout" className="max-h-[60%] max-w-full object-contain mx-auto" />
      ) : (
        <div className="border border-slate-200 rounded p-10 text-center text-slate-400">No layout image uploaded</div>
      )}
    </ReportPageFrame>
  );
}

export function ReportPreview() {
  const { report } = useReport();
  const { sensors } = useAnalysis();

  if (!report) return null;

  const isProtocol = report.documentType === 'protocol';

  if (isProtocol) {
    // Protocol mode has a fixed 36-page structure to match the template page-for-page!
    const totalPages = 36;

    return (
      <div id="report-print-root" className="light-surface flex flex-col items-center gap-8 bg-slate-100 py-8 print:bg-white print:py-0">
        <div className="mb-2 flex max-w-[210mm] items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 print:hidden">
          <span>
            Preview of all {totalPages} pages of the approved Thermal Mapping Protocol, matching the reference template precisely.
          </span>
        </div>
        <CoverPage totalPages={totalPages} />                                    {/* Page 1 */}
        <TableOfContentsPage totalPages={totalPages} />                           {/* Page 2 */}
        <ApprovalPage totalPages={totalPages} />                                  {/* Page 3 */}
        <IntroductionPage pageNumber={4} totalPages={totalPages} />               {/* Page 4 */}
        <ProtocolExecutionInstructionsPage pageNumber={5} totalPages={totalPages} /> {/* Page 5 */}
        <ProtocolRolesPage pageNumber={6} totalPages={totalPages} />               {/* Page 6 */}
        <SystemBriefDescriptionPage pageNumber={7} totalPages={totalPages} />      {/* Page 7 */}
        <NarrativePage pageNumber={8} totalPages={totalPages} />                  {/* Page 8 */}
        <StabilityChamberDescriptionPage pageNumber={9} totalPages={totalPages} /> {/* Page 9 */}
        <LoadingDescriptionPages startPageNumber={10} totalPages={totalPages} />    {/* Page 10 & 11 (2 pages) */}
        <ChamberLayoutPage pageNumber={12} totalPages={totalPages} />               {/* Page 12 */}
        <ChamberPhotosPage pageNumber={13} totalPages={totalPages} />               {/* Page 13 */}
        <TestDataSheetPages startPageNumber={14} totalPages={totalPages} />        {/* Page 14 & 15 (2 pages) */}
        <WorstPointsLayoutPage pageNumber={16} totalPages={totalPages} />          {/* Page 16 (PQ report/conclusion & layout with worst points) */}
        <ChartsPlaceholderPage pageNumber={17} totalPages={totalPages} title="13.2.4 Charts" /> {/* Page 17 */}
        <WorstPointsLayoutPage pageNumber={18} totalPages={totalPages} />          {/* Page 18 */}
        <ChartsPlaceholderPage pageNumber={19} totalPages={totalPages} title="13.2.5 worst points layout" /> {/* Page 19 */}
        <ChallengeTestPages startPageNumber={20} totalPages={totalPages} />        {/* Page 20 to 25 (6 pages) */}
        <CalibrationPages startPageNumber={26} totalPages={totalPages} />          {/* Page 26 & 27 (2 pages) */}
        <ChartsPlaceholderPage pageNumber={28} totalPages={totalPages} title="Calibration Certificates" /> {/* Page 28 */}
        <SopAvailabilityPage pageNumber={29} totalPages={totalPages} />             {/* Page 29 */}
        <CriticalParametersCalibrationPage pageNumber={30} totalPages={totalPages} /> {/* Page 30 */}
        <SignatureLogPage pageNumber={31} totalPages={totalPages} />                {/* Page 31 */}
        <AddendumPage pageNumber={32} totalPages={totalPages} />                   {/* Page 32 */}
        <DeviationsPage pageNumber={33} totalPages={totalPages} />                 {/* Page 33 */}
        <AttachmentsListPage pageNumber={34} totalPages={totalPages} />             {/* Page 34 */}
        <FinalApprovalPage pageNumber={35} totalPages={totalPages} />               {/* Page 35 */}
        <FinalApprovalSecondPage pageNumber={36} totalPages={totalPages} />         {/* Page 36 */}
      </div>
    );
  }

  // Report Mode (Dynamic length as before)
  const FIXED_PAGES_BEFORE_LOADING = 7;
  const FIXED_PAGES_AFTER_LOADING = 2;
  const FIXED_TRAILING_PAGES_REPORT = 7;

  const loadingPageCount = chunkLoadingItems(report.loadingItems).length;
  
  const testDataPageCount = chunkTestDataRows(
    report.chamberLayout.dataloggers,
    sensors,
    report.studyPeriod.startDateTime,
    report.studyPeriod.endDateTime,
    report.chamberDescription.acceptanceCriteria,
    false,
  );
  const chartsPageCount = countChartsPages(
    report.chamberLayout.dataloggers,
    sensors,
    report.studyPeriod.startDateTime,
    report.studyPeriod.endDateTime,
  );
  const challengePageCount = countChallengeTestPages(
    report.challengeTests,
    report.chamberLayout.dataloggers,
    sensors,
    report.chamberDescription.acceptanceCriteria,
    false,
  );
  const calibrationPageCount = countCalibrationPages(report.calibrationRecords);

  const loadingStartPage = FIXED_PAGES_BEFORE_LOADING + 1;
  const layoutPageNumber = loadingStartPage + loadingPageCount;
  const photosPageNumber = layoutPageNumber + 1;
  const testDataStartPage = photosPageNumber + 1;
  const chartsStartPage = testDataStartPage + testDataPageCount;
  const challengeStartPage = chartsStartPage + chartsPageCount;
  const calibrationStartPage = challengeStartPage + challengePageCount;
  const sopPageNumber = calibrationStartPage + calibrationPageCount;
  const criticalParamsPageNumber = sopPageNumber + 1;
  const signatureLogPageNumber = criticalParamsPageNumber + 1;
  const deviationsPageNumber = signatureLogPageNumber + 1;
  const attachmentsPageNumber = deviationsPageNumber + 1;
  const finalApprovalPageNumber = attachmentsPageNumber + 1;

  const totalPages =
    FIXED_PAGES_BEFORE_LOADING +
    loadingPageCount +
    FIXED_PAGES_AFTER_LOADING +
    testDataPageCount +
    chartsPageCount +
    challengePageCount +
    calibrationPageCount +
    FIXED_TRAILING_PAGES_REPORT;

  return (
    <div id="report-print-root" className="light-surface flex flex-col items-center gap-8 bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mb-2 flex max-w-[210mm] items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 print:hidden">
        <span>
          Preview of all {totalPages} implemented report pages, front cover through final approval. The Signature
          Log and Critical Parameters Calibration List appendices are auto-generated from data entered elsewhere —
          no re-entry needed.
        </span>
      </div>
      <CoverPage totalPages={totalPages} />
      <TableOfContentsPage totalPages={totalPages} />
      <ApprovalPage totalPages={totalPages} />
      <IntroductionPage pageNumber={4} totalPages={totalPages} />
      <SystemBriefDescriptionPage pageNumber={5} totalPages={totalPages} />
      <NarrativePage pageNumber={6} totalPages={totalPages} />
      <StabilityChamberDescriptionPage pageNumber={7} totalPages={totalPages} />
      <LoadingDescriptionPages startPageNumber={loadingStartPage} totalPages={totalPages} />
      <ChamberLayoutPage pageNumber={layoutPageNumber} totalPages={totalPages} />
      <ChamberPhotosPage pageNumber={photosPageNumber} totalPages={totalPages} />
      <TestDataSheetPages startPageNumber={testDataStartPage} totalPages={totalPages} />
      <ChartsPages startPageNumber={chartsStartPage} totalPages={totalPages} />
      <ChallengeTestPages startPageNumber={challengeStartPage} totalPages={totalPages} />
      <CalibrationPages startPageNumber={calibrationStartPage} totalPages={totalPages} />
      <StudyResultsPage pageNumber={sopPageNumber} totalPages={totalPages} />
      <SopAvailabilityPage pageNumber={sopPageNumber + 1} totalPages={totalPages} />
      <CriticalParametersCalibrationPage pageNumber={criticalParamsPageNumber + 1} totalPages={totalPages} />
      <SignatureLogPage pageNumber={signatureLogPageNumber + 1} totalPages={totalPages} />
      <DeviationsPage pageNumber={deviationsPageNumber + 1} totalPages={totalPages} />
      <AttachmentsListPage pageNumber={attachmentsPageNumber + 1} totalPages={totalPages} />
      <FinalApprovalPage pageNumber={finalApprovalPageNumber + 1} totalPages={totalPages} />
    </div>
  );
}
