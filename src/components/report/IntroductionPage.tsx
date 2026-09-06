import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';
import type { ResponsibilityItem } from '../../types/report';

function BulletList({ items }: { items: ResponsibilityItem[] }) {
  if (items.length === 0) return <p className="text-[10px] italic text-slate-400">None entered.</p>;
  return (
    <ul className="list-disc space-y-0.5 pl-4 text-[10px] text-slate-600">
      {items.map((i) => (
        <li key={i.id}>{i.text || '—'}</li>
      ))}
    </ul>
  );
}

export function IntroductionPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { introduction, rolesResponsibilities, documentInfo } = report;
  const isProtocol = report.documentType === 'protocol';

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-3 text-sm font-bold text-slate-800">2. Introduction</h2>
      <p className="mb-4 text-[11px] text-slate-600">
        The purpose of this {isProtocol ? 'Thermal Mapping Protocol' : 'report'} for the chamber at {documentInfo.clientName || 'Client Company'} is to describe the tests {isProtocol ? 'that will be' : ''} executed on site.
      </p>

      <h3 className="mb-1 text-xs font-bold text-slate-700">2.1 {isProtocol ? 'Protocol' : 'Report'} Purpose</h3>
      <p className="mb-3 whitespace-pre-line text-[11px] text-slate-600">{introduction.purpose}</p>

      <h3 className="mb-1 text-xs font-bold text-slate-700">2.2 {isProtocol ? 'Protocol' : 'Report'} Scope</h3>
      <p className="mb-4 whitespace-pre-line text-[11px] text-slate-600">{introduction.scope}</p>

      {isProtocol ? (
        <>
          <h3 className="mb-1 text-xs font-bold text-slate-700">2.3 Signature Log</h3>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Each person recording or reviewing the information in this document must complete the Signature log (see Appendix N.3).
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-3 text-xs font-bold text-slate-700">2.4 Roles and Responsibilities</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Client — Engineering / Validation
              </h4>
              <BulletList items={rolesResponsibilities.clientEngineeringValidation} />
            </div>
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Client — Quality</h4>
              <BulletList items={rolesResponsibilities.clientQuality} />
            </div>
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Performing company
              </h4>
              <BulletList items={rolesResponsibilities.performingCompany} />
            </div>
          </div>
        </>
      )}
    </ReportPageFrame>
  );
}

export function ProtocolExecutionInstructionsPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-3 text-sm font-bold text-slate-800">2.4 Protocol Execution Instructions</h2>
      <div className="space-y-3 text-[9px] text-slate-600 leading-relaxed">
        <p>
          Prior to the initiation of qualification testing activities, this document will be generated, reviewed and approved by the appropriate personnel.
        </p>
        <p>
          The testing specified in this approved protocol will be conducted in accordance with the instruction detailed in the test cases.
        </p>
        <p className="font-semibold text-slate-700">Additional documentation requirements are as follows:</p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>Each person recording or reviewing the information in this document must complete the Signature Log.</li>
          <li>After completing entries in the test cases, the initials and date of the individual responsible for the entry must be entered in the appropriate column.</li>
          <li>Any blank entry space or box must have a line drawn through it, initialed, and dated.</li>
          <li>Any correction entry must be marked with a unique line drawn through the data to be changed, initialed, and dated. After correction, wrong data must remain readable.</li>
          <li>
            General datasheets and/or supporting documentation must be inserted as near to the related test datasheet as possible and must include the following information:
            <ul className="list-none pl-4 mt-1 font-semibold text-slate-800">
              <li>- Reference to supplemented datasheet</li>
              <li>- A unique id number (i.e. number of the supplemented datasheet + [a], [b], ... [aa], [ab], etc.)</li>
              <li>- Page number</li>
            </ul>
          </li>
          <li>Supporting documentation not related to a specific datasheet can be attached at the end of this document. Attachments list (Appendix N.6) have to be used to assign a unique id number.</li>
          <li>Attachments are to be intended both as digital/magnetic and paper supported.</li>
          <li>When approved vendor documentation (protocols) is available and approved by {documentInfo.clientName || 'Client Company'}, it will be possible to use it for the execution of the protocol tests at the condition that the documentation meets the minimal requirements listed above.</li>
          <li>Any test exception and failure verified during the protocol execution shall be noted on Deviation form. Every exception and its conclusion (intended as foreseen corrective action results) shall be documented inside the related qualification summary.</li>
        </ul>
        <p className="font-semibold text-slate-700">Implementing the mapping report recommendations:</p>
        <p>
          The final outcome and purpose of a mapping exercise is the implementation of the report recommendations. Report should include the following outcomes:
        </p>
        <ul className="list-decimal pl-4 space-y-1">
          <li><strong>Introduction:</strong> a description of the objectives of the mapping study.</li>
          <li><strong>Summary:</strong> a summary and discussion of the results organized in the sequence set out in the mapping protocol, including a summary of deviations (if any).</li>
          <li><strong>Conclusions and recommendations:</strong> a general conclusion for all verifications and observations indicating the acceptability of the equipment for operation. Recommendations and remarks can be incorporated in this section.</li>
          <li>
            <strong>Report annexes:</strong> The annexes to the report should contain the following:
            <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
              <li>– the site survey, showing data loggers locations;</li>
              <li>– the raw data, presented using the appropriate test data sheet format;</li>
              <li>– spreadsheet data and related temperature graphs for every Data loggers used in the mapping exercise;</li>
              <li>– raw results of the data analysis, including hot and cold spots;</li>
              <li>– key documents and notes prepared during the mapping exercise, together with any other supporting material;</li>
              <li>– deviation reports, including corrective and preventive actions (CAPA) forms, if required;</li>
              <li>– calibration certificates for all data loggers used.</li>
            </ul>
          </li>
        </ul>
      </div>
    </ReportPageFrame>
  );
}

export function ProtocolRolesPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { rolesResponsibilities, documentInfo } = report;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">2.5 Roles and Responsibilities</h2>
      <p className="mb-4 text-[10px] text-slate-600">
        For the submission/approval, execution of this protocol and its final report, the responsibility of all personnel involved with the verification and documentation process are as follows:
      </p>
      
      <div className="space-y-4">
        <div>
          <h3 className="mb-1 text-xs font-bold text-slate-700 border-b pb-0.5">2.5.1 {documentInfo.clientName || 'Client Company'}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-2">
            <div>
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">2.5.1.1 Engineering / Validation</h4>
              <BulletList items={rolesResponsibilities.clientEngineeringValidation} />
            </div>
            <div>
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">2.5.1.2 Quality</h4>
              <BulletList items={rolesResponsibilities.clientQuality} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-1.5 text-xs font-bold text-slate-700 border-b pb-0.5">2.5.2 {documentInfo.performingCompanyName || 'Performing Company'}</h3>
          <div className="mt-2">
            <BulletList items={rolesResponsibilities.performingCompany} />
          </div>
        </div>
      </div>
    </ReportPageFrame>
  );
}
