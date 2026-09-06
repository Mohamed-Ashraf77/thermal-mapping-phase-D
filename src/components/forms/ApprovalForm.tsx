import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { PersonTable } from './PersonTable';

export function ApprovalForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const { approval } = report;

  return (
    <SectionCard
      title="Document Review & Approval"
      description="Populates the signature tables on the report's approval page. Add one row per signer."
    >
      <div className="flex flex-col gap-6">
        <PersonTable
          label="Performing company — Author(s)"
          entries={approval.tagAuthors}
          onChange={(entries) => update((r) => { r.approval.tagAuthors = entries; })}
        />
        <PersonTable
          label="Performing company — Tester(s)"
          entries={approval.tagTesters}
          onChange={(entries) => update((r) => { r.approval.tagTesters = entries; })}
        />
        <PersonTable
          label="Performing company — Reviewer(s)"
          entries={approval.tagReviewers}
          onChange={(entries) => update((r) => { r.approval.tagReviewers = entries; })}
        />
        <PersonTable
          label="Client — Reviewer(s)"
          entries={approval.clientReviewers}
          onChange={(entries) => update((r) => { r.approval.clientReviewers = entries; })}
        />
        <PersonTable
          label="Approver(s)"
          entries={approval.approvers}
          onChange={(entries) => update((r) => { r.approval.approvers = entries; })}
        />
      </div>
    </SectionCard>
  );
}
