import { useState } from 'react';
import { Lock, Unlock, Send, CheckCircle2, Clock, FileEdit, ShieldAlert } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { useAuth } from '../../store/AuthContext';
import { useAudit } from '../../store/AuditContext';
import { SigningDialog } from '../auth/SigningDialog';
import type { DocumentStatus } from '../../types/report';

const STATUS_CONFIG: Record<DocumentStatus, {
  label: string;
  icon: React.ReactNode;
  badgeCls: string;
  description: string;
}> = {
  draft: {
    label: 'Draft',
    icon: <FileEdit className="h-3.5 w-3.5" />,
    badgeCls: 'bg-slate-100 text-slate-600 border-slate-200',
    description: 'Document is being edited.',
  },
  under_review: {
    label: 'Under Review',
    icon: <Clock className="h-3.5 w-3.5" />,
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Submitted for QA review — awaiting final approval.',
  },
  approved: {
    label: 'Approved — Locked',
    icon: <Lock className="h-3.5 w-3.5" />,
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Document is approved and locked. No further edits permitted.',
  },
};

type SigningAction = 'submit' | 'lock' | 'unlock' | null;

const SIGNING_CONFIG: Record<Exclude<SigningAction, null>, { title: string; actionDescription: string }> = {
  submit: {
    title: 'Submit for Review',
    actionDescription: 'Submit this document for QA review. It will be marked "Under Review" and changes will be tracked.',
  },
  lock: {
    title: 'Final Approval & Lock',
    actionDescription: 'Apply final approval and lock this document. It will become read-only and no further edits will be permitted without an administrative unlock.',
  },
  unlock: {
    title: 'Unlock Document',
    actionDescription: 'Unlock this approved document and return it to Draft status. This action will be permanently recorded in the audit trail with your identity.',
  },
};

export function DocumentStatusBar() {
  const { report, submitForReview, lockDocument, unlockDocument, isLocked } = useReport();
  const { session, can } = useAuth();
  const { log } = useAudit();
  const [signingAction, setSigningAction] = useState<SigningAction>(null);

  if (!report) return null;

  const cfg = STATUS_CONFIG[report.status];

  async function handleSigningResult(confirmed: boolean) {
    if (!confirmed || !signingAction || !session) {
      setSigningAction(null);
      return;
    }

    const docId = report!.id;
    const docNumber = report!.documentInfo.documentNumber || undefined;
    const docType = report!.documentType;

    if (signingAction === 'submit') {
      await submitForReview();
      await log({
        action: 'DOCUMENT_SUBMITTED_FOR_REVIEW',
        documentId: docId,
        documentNumber: docNumber,
        documentType: docType,
        detail: `Submitted by ${session.displayName}`,
      });
    } else if (signingAction === 'lock') {
      await lockDocument(session.userId, session.displayName);
      await log({
        action: 'DOCUMENT_LOCKED',
        documentId: docId,
        documentNumber: docNumber,
        documentType: docType,
        detail: `Locked and approved by ${session.displayName} (${session.role})`,
      });
    } else if (signingAction === 'unlock') {
      await unlockDocument();
      await log({
        action: 'DOCUMENT_UNLOCKED',
        documentId: docId,
        documentNumber: docNumber,
        documentType: docType,
        detail: `Unlocked by ${session.displayName} (${session.role})`,
      });
    }

    setSigningAction(null);
  }

  const canSubmit = report.status === 'draft' && can('editDocument');
  const canLock = (report.status === 'draft' || report.status === 'under_review') && can('approveDocument');
  const canUnlock = report.status === 'approved' && can('unlockDocument');

  return (
    <>
      {signingAction && (
        <SigningDialog
          title={SIGNING_CONFIG[signingAction].title}
          actionDescription={SIGNING_CONFIG[signingAction].actionDescription}
          onResult={handleSigningResult}
        />
      )}

      <div className={`flex items-center justify-between border-b px-4 py-2.5 print:hidden ${
        report.status === 'approved'
          ? 'border-emerald-200 bg-emerald-50'
          : report.status === 'under_review'
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}>
        {/* Status badge + info */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.badgeCls}`}>
            {cfg.icon} {cfg.label}
          </span>
          <span className="hidden text-[11px] text-slate-500 sm:block">{cfg.description}</span>

          {/* Lock info */}
          {report.status === 'approved' && report.lockedAt && (
            <span className="hidden text-[10px] font-medium text-emerald-600 sm:block">
              Locked by {report.lockedByDisplayName} on{' '}
              {new Date(report.lockedAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isLocked && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              <ShieldAlert className="h-3 w-3" /> Read-only
            </div>
          )}

          {canSubmit && (
            <button
              type="button"
              onClick={() => setSigningAction('submit')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition"
            >
              <Send className="h-3.5 w-3.5" /> Submit for Review
            </button>
          )}

          {canLock && (
            <button
              type="button"
              onClick={() => setSigningAction('lock')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Lock
            </button>
          )}

          {canUnlock && (
            <button
              type="button"
              onClick={() => setSigningAction('unlock')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <Unlock className="h-3.5 w-3.5" /> Unlock
            </button>
          )}
        </div>
      </div>
    </>
  );
}
