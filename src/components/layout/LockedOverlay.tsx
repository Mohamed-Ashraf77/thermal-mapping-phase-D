import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useReport } from '../../store/ReportContext';

interface LockedOverlayProps {
  children: ReactNode;
}

/**
 * Wraps form content. When the current document is locked (status === 'approved'),
 * renders a full-section overlay that blocks all interaction.
 *
 * This is the UI enforcement layer — the actual data model prevents
 * `update()` calls from changing locked documents (isLocked check in the
 * context before writing to IndexedDB).
 */
export function LockedOverlay({ children }: LockedOverlayProps) {
  const { isLocked } = useReport();

  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative">
      {/* Render the form content beneath — so users can still read it */}
      <div className="pointer-events-none select-none opacity-50">{children}</div>

      {/* Full-section blocking overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-50/80 backdrop-blur-[1px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 shadow">
          <Lock className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">Document Locked</p>
          <p className="mt-0.5 text-xs text-slate-500">
            This document has been approved and locked.
            <br />
            Contact a QA Manager or System Admin to unlock.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for components that need to know if the document is locked,
 * e.g., to conditionally disable individual controls.
 */
export function useIsLocked(): boolean {
  const { isLocked } = useReport();
  return isLocked;
}
