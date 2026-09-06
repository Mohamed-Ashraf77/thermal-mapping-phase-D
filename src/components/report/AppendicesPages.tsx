import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

export function SopAvailabilityPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;
  const items = report.sopAvailability;
  const isProtocol = report.documentType === 'protocol';

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">Appendix N.1 — SOP Availability</h2>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">SOP Type</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Applicable</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Title</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">ID Number</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="border border-slate-300 px-2 py-6 text-center text-slate-400">
                {isProtocol ? `To be filled by ${documentInfo.clientName || 'Client Company'}.` : 'To be completed by the client.'}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-300 px-2 py-1.5">{item.sopType || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{item.applicable ? 'Y' : 'N'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{item.title || '—'}</td>
                <td className="border border-slate-300 px-2 py-1.5">{item.identificationNumber || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {isProtocol && (
        <div className="grid grid-cols-2 gap-6 pt-12 mt-12 border-t border-slate-100 text-[10px] text-slate-600">
          <div>
            <p className="font-bold text-slate-700 mb-1">Reviewed By ({documentInfo.performingCompanyName || 'Performing Company'})</p>
            <p className="mb-1">Name: {report.approval.tagReviewers[0]?.name || '_____________________'}</p>
            <p className="mb-1">Signature: __________________</p>
            <p>Date: ____/____/________</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">Reviewed By ({documentInfo.clientName || 'Client Company'})</p>
            <p className="mb-1">Name: {report.approval.clientReviewers[0]?.name || '_____________________'}</p>
            <p className="mb-1">Signature: __________________</p>
            <p>Date: ____/____/________</p>
          </div>
        </div>
      )}
    </ReportPageFrame>
  );
}

export function AttachmentsListPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const items = report.attachments;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">Appendix N.6 — Attachments List</h2>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">No.</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Description</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">No. of pages</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td className="border border-slate-300 px-2 py-2">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-2">{item.description || '—'}</td>
              <td className="border border-slate-300 px-2 py-2">{item.numberOfPages || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-20 pt-8 border-t border-slate-200 text-[10px] text-slate-500">
        <p>This page has been reviewed by: _______________________ &nbsp;&nbsp;&nbsp;&nbsp; Date: ____/____/________</p>
      </div>
    </ReportPageFrame>
  );
}

export function AddendumPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">Appendix N.4 — Addendum Form</h2>
      <div className="border border-slate-300 rounded-lg p-6 space-y-6 text-[10px] text-slate-600 h-[85%] flex flex-col justify-between">
        <div className="space-y-4">
          <p className="flex justify-between border-b pb-2 font-mono">
            <span>Copy ____ of ____</span>
          </p>
          <div className="space-y-2">
            <p className="font-semibold text-slate-700">Test Report (No. and description)</p>
            <div className="h-32 border border-dashed border-slate-300 rounded bg-slate-50/50 p-3">
              <span className="text-slate-400">................................................................................................................................................................................</span>
            </div>
          </div>
        </div>
        
        {/* Approvals footer */}
        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200">
          <div>
            <p className="font-bold text-slate-700 mb-1">Reviewed By ({documentInfo.performingCompanyName || 'Performing Company'})</p>
            <p className="mb-1">Name: {report.approval.tagReviewers[0]?.name || '_____________________'}</p>
            <p className="mb-1">Signature: __________________</p>
            <p>Date: ____/____/________</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">Reviewed By ({documentInfo.clientName || 'Client Company'})</p>
            <p className="mb-1">Name: {report.approval.clientReviewers[0]?.name || '_____________________'}</p>
            <p className="mb-1">Signature: __________________</p>
            <p>Date: ____/____/________</p>
          </div>
        </div>
      </div>
    </ReportPageFrame>
  );
}

export function DeviationsPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;
  const items = report.deviations;
  const isProtocol = report.documentType === 'protocol';

  if (isProtocol) {
    return (
      <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
        <h2 className="mb-4 text-sm font-bold text-slate-800">Appendix N.5 — Deviation Form</h2>
        <div className="border border-slate-300 rounded-lg p-4 space-y-4 text-[10px] text-slate-600 h-[88%] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-1 font-mono text-[9px]">
              <span>Copy ____ of ____</span>
              <span>Deviation No. _________</span>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Test Report (No. and description)</p>
              <p className="text-slate-400 mt-1">.................................................................................................................................</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Description:</p>
              <div className="h-16 border border-slate-200 rounded mt-1 bg-slate-50/50 p-2"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-slate-700">Signature {documentInfo.performingCompanyName || 'Performing Company'}:</p>
                <p className="text-slate-400 mt-1">________________ Date: _________</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Signature {documentInfo.clientName || 'Client'}:</p>
                <p className="text-slate-400 mt-1">________________ Date: _________</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Corrective Action:</p>
              <div className="h-16 border border-slate-200 rounded mt-1 bg-slate-50/50 p-2"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-slate-700">Person in charge to close</p>
                <p className="text-slate-400 mt-1">...................................................</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Expected closure date</p>
                <p className="text-slate-400 mt-1">...................................................</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-slate-700">Signature {documentInfo.performingCompanyName || 'Performing Company'}:</p>
                <p className="text-slate-400">________________ Date: _________</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Signature {documentInfo.clientName || 'Client'}:</p>
                <p className="text-slate-400">________________ Date: _________</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="font-semibold text-slate-700">Deviation successfully solved? &nbsp;&nbsp; YES _______ &nbsp;&nbsp;&nbsp; NO _______</p>
            </div>
          </div>
        </div>
      </ReportPageFrame>
    );
  }

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">Appendix N.5 — Deviation Form</h2>
      {items.length === 0 ? (
        <p className="text-[11px] italic text-slate-500">No deviations were recorded during this study.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((dev) => (
            <table key={dev.id} className="w-full border-collapse text-[10px]">
              <tbody>
                <tr>
                  <td className="w-1/4 border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
                    Deviation No.
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">{dev.deviationNumber}</td>
                  <td className="w-1/4 border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
                    Resolved
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">{dev.resolved ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
                    Description
                  </td>
                  <td colSpan={3} className="border border-slate-300 px-2 py-1.5">
                    {dev.description || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
                    Corrective action
                  </td>
                  <td colSpan={3} className="border border-slate-300 px-2 py-1.5">
                    {dev.correctiveAction || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
                    Person in charge
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">{dev.personInCharge || '—'}</td>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
                    Expected closure
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">{dev.expectedClosureDate || '—'}</td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      )}
    </ReportPageFrame>
  );
}

export function FinalApprovalPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { documentInfo } = report;
  const fa = report.finalApproval;
  const isProtocol = report.documentType === 'protocol';

  const verdictLabel =
    fa.verdict === 'positive'
      ? 'POSITIVE'
      : fa.verdict === 'passWithDeviation'
        ? 'PASS WITH DEVIATION'
        : fa.verdict === 'negative'
          ? 'NEGATIVE'
          : 'PENDING';

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-wide text-slate-800">
        Final Review and Approval
      </h2>
      <p className="mb-4 text-[11px] text-slate-600 leading-relaxed">
        {isProtocol ? (
          'The review of the test execution and the relevant raw data allow concluding that the Thermal Mapping study has been concluded:'
        ) : (
          'The review of the test execution and the relevant raw data allow concluding that the thermal mapping study has been concluded:'
        )}
      </p>
      <div className="mb-6 flex justify-center gap-4 text-xs font-bold">
        {['POSITIVE', 'PASS WITH DEVIATION', 'NEGATIVE'].map((label) => (
          <span
            key={label}
            className={`rounded border px-3 py-1.5 ${
              !isProtocol && verdictLabel === label ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {!isProtocol && fa.notes && (
        <div className="mb-6">
          <h3 className="mb-1 text-xs font-bold text-slate-700">Notes</h3>
          <p className="whitespace-pre-line text-[11px] text-slate-600">{fa.notes}</p>
        </div>
      )}

      {isProtocol && (
        <div className="mb-10 text-[10px] text-slate-500">
          <p className="font-semibold text-slate-700 mb-1">NOTES:</p>
          <p className="h-20 border border-dashed border-slate-300 rounded p-2 bg-slate-50/50"></p>
        </div>
      )}

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Name</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Company</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Signature</th>
            <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">Date</th>
          </tr>
        </thead>
        <tbody>
          {isProtocol ? (
            <>
              <tr>
                <td className="border border-slate-300 px-2 py-3">{report.approval.tagReviewers[0]?.name || '______________________'}</td>
                <td className="border border-slate-300 px-2 py-3">{documentInfo.performingCompanyName || 'Performing Company'}</td>
                <td className="border border-slate-300 px-2 py-3 text-slate-300"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-3">{report.approval.clientReviewers[0]?.name || '______________________'}</td>
                <td className="border border-slate-300 px-2 py-3">{documentInfo.clientName || 'Client Company'}</td>
                <td className="border border-slate-300 px-2 py-3 text-slate-300"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
              </tr>
            </>
          ) : (
            fa.approvers.map((a) => (
              <tr key={a.id}>
                <td className="border border-slate-300 px-2 py-2">{a.name || '—'}</td>
                <td className="border border-slate-300 px-2 py-2">{a.company || '—'}</td>
                <td className="border border-slate-300 px-2 py-2 text-center text-slate-300">
                  {a.signaturePresent ? '✓' : ''}
                </td>
                <td className="border border-slate-300 px-2 py-2">{a.date || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ReportPageFrame>
  );
}

export function FinalApprovalSecondPage(props: { pageNumber: number; totalPages: number }) {
  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-slate-800">
        Final Review and Approval
      </h2>
      <p className="mb-4 text-[10px] text-slate-600 italic leading-relaxed border border-amber-100 bg-amber-50/50 p-3 rounded">
        This page must be filled only if the Thermal Mapping Study phase has been concluded with deviations not resolved.
        In contrary case this page must have annulled from the Quality Insurance department.
      </p>
      
      <div className="space-y-4 text-[9px] text-slate-600">
        <div>
          <p className="font-semibold text-slate-700">
            Reviewed that currently present deviations don't affect the following activities of thermal study, although the result of the present study is not positive, it is authorized to proceed with the following phase (if applicable).
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="border border-slate-200 rounded p-2">
              <p className="font-semibold">Approved by:</p>
              <p className="text-slate-400 mt-4">Signature: _______________________ Date: _________</p>
            </div>
            <div className="border border-slate-200 rounded p-2">
              <p className="font-semibold">Approved by:</p>
              <p className="text-slate-400 mt-4">Signature: _______________________ Date: _________</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="font-semibold text-slate-700">
            In base to the results obtained during the application of the corrective actions of the deviations previously not resolved or execution of test previously not performed, the phase of "Operation Qualification" it is considered closed with result:
          </p>
          <div className="flex gap-4 font-bold my-2 text-[10px]">
            <span className="border px-4 py-1.5 rounded text-slate-400">POSITIVE</span>
            <span className="border px-4 py-1.5 rounded text-slate-400">NEGATIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="border border-slate-200 rounded p-2">
              <p className="font-semibold">Approved by:</p>
              <p className="text-slate-400 mt-4">Signature: _______________________ Date: _________</p>
            </div>
            <div className="border border-slate-200 rounded p-2">
              <p className="font-semibold">Approved by:</p>
              <p className="text-slate-400 mt-4">Signature: _______________________ Date: _________</p>
            </div>
          </div>
        </div>
      </div>
    </ReportPageFrame>
  );
}
