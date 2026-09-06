import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { produce } from 'immer';
import type { ReportDocument } from '../types/report';
import { createDefaultReportDocument } from '../data/defaultReport';
import {
  idbGetAllDocuments,
  idbSaveDocument,
  idbDeleteDocument,
  idbGetDocument,
  isIndexedDbAvailable,
} from '../lib/idbStore';
import { createId } from '../utils/id';

type Recipe = (draft: ReportDocument) => void;

interface ReportContextValue {
  report: ReportDocument | null; // null means we are on the dashboard
  allDocuments: ReportDocument[];
  loadingDocs: boolean;
  update: (recipe: Recipe) => void;
  resetReport: () => void;
  replaceReport: (next: ReportDocument) => void;
  openDocument: (id: string | null) => void;
  createDocument: (type: 'report' | 'protocol', title?: string) => Promise<ReportDocument>;
  deleteDoc: (id: string) => Promise<void>;
  duplicateDoc: (id: string, asType?: 'report' | 'protocol') => Promise<ReportDocument>;
  /** Submit the current document for QA review (draft → under_review). */
  submitForReview: () => Promise<void>;
  /** Lock the document as approved (requires e-signature confirmation upstream).
   *  Sets status → 'approved' and records who/when. */
  lockDocument: (userId: string, displayName: string) => Promise<void>;
  /** Unlock a locked document back to draft (admin/QA only). */
  unlockDocument: () => Promise<void>;
  /** True if the current document is locked (read-only). */
  isLocked: boolean;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({
  children,
  initialReport,
  persist = true,
}: {
  children: ReactNode;
  /** When provided, seeds state with this document instead of reading
   * database — used by the /print/:id hydration route. */
  initialReport?: ReportDocument;
  /** When false, never reads or writes database. Used in print mode so
   * generating a PDF for one job can't clobber the user's real saved data. */
  persist?: boolean;
}) {
  const [report, setReport] = useState<ReportDocument | null>(() => initialReport ?? null);
  const [allDocuments, setAllDocuments] = useState<ReportDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(persist && !initialReport);

  // Load all documents from database on mount
  const refreshDocumentsList = useCallback(async () => {
    if (!persist || !isIndexedDbAvailable()) {
      setLoadingDocs(false);
      return;
    }
    try {
      const docs = await idbGetAllDocuments();
      setAllDocuments(docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (err) {
      console.error('Failed to load documents from IDB:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [persist]);

  useEffect(() => {
    refreshDocumentsList();
  }, [refreshDocumentsList]);

  // Save the current active document when it changes
  useEffect(() => {
    if (!persist || !report || !isIndexedDbAvailable()) return;
    const handle = window.setTimeout(async () => {
      try {
        const updatedReport = {
          ...report,
          updatedAt: new Date().toISOString(),
        };
        await idbSaveDocument(updatedReport);
        setAllDocuments((prev) =>
          prev.map((d) => (d.id === updatedReport.id ? updatedReport : d))
        );
      } catch (err) {
        console.error('Failed to save document to IDB:', err);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [report, persist]);

  const update = useCallback((recipe: Recipe) => {
    setReport((prev) => {
      if (!prev) return prev;
      // 21 CFR Part 11 — locked documents are immutable through normal edits.
      // Status transitions (submitForReview, lockDocument, unlockDocument)
      // bypass this check intentionally because they operate directly on state.
      if (prev.status === 'approved') {
        console.warn('[ReportContext] update() blocked — document is locked (approved).');
        return prev;
      }
      return produce(prev, recipe);
    });
  }, []);

  const resetReport = useCallback(() => {
    setReport((prev) => {
      if (!prev) return prev;
      const defaults = createDefaultReportDocument();
      return {
        ...defaults,
        id: prev.id,
        documentType: prev.documentType,
        createdAt: prev.createdAt,
      };
    });
  }, []);

  const replaceReport = useCallback((next: ReportDocument) => {
    setReport(next);
  }, []);

  const openDocument = useCallback(async (id: string | null) => {
    if (!id) {
      setReport(null);
      await refreshDocumentsList();
      return;
    }
    if (!persist) return;
    try {
      const doc = await idbGetDocument(id);
      if (doc) {
        setReport(doc);
      }
    } catch (err) {
      console.error('Failed to get document:', err);
    }
  }, [persist, refreshDocumentsList]);

  const createDocument = useCallback(async (type: 'report' | 'protocol', title?: string) => {
    const defaults = createDefaultReportDocument();
    const now = new Date().toISOString();
    const newDoc: ReportDocument = {
      ...defaults,
      id: createId('doc'),
      documentType: type,
      createdAt: now,
      updatedAt: now,
      documentInfo: {
        ...defaults.documentInfo,
        reportTitle: type === 'protocol' ? 'Thermal Mapping Protocol' : 'Thermal Mapping Report',
        systemName: title || defaults.documentInfo.systemName,
      },
    };
    if (persist && isIndexedDbAvailable()) {
      await idbSaveDocument(newDoc);
      await refreshDocumentsList();
    }
    setReport(newDoc);
    return newDoc;
  }, [persist, refreshDocumentsList]);

  const deleteDoc = useCallback(async (id: string) => {
    if (persist && isIndexedDbAvailable()) {
      await idbDeleteDocument(id);
      await refreshDocumentsList();
      if (report && report.id === id) {
        setReport(null);
      }
    }
  }, [persist, report, refreshDocumentsList]);

  const duplicateDoc = useCallback(async (id: string, asType?: 'report' | 'protocol') => {
    if (!persist) throw new Error('Cannot duplicate in print-only mode');
    const sourceDoc = await idbGetDocument(id);
    if (!sourceDoc) throw new Error('Source document not found');

    const now = new Date().toISOString();
    const targetType = asType || sourceDoc.documentType;
    const duplicated: ReportDocument = {
      ...sourceDoc,
      id: createId('doc'),
      documentType: targetType,
      createdAt: now,
      updatedAt: now,
      documentInfo: {
        ...sourceDoc.documentInfo,
        reportTitle: targetType === 'protocol' ? 'Thermal Mapping Protocol' : 'Thermal Mapping Report',
        systemName: asType && asType !== sourceDoc.documentType
          ? `${sourceDoc.documentInfo.systemName} (Converted)`
          : `${sourceDoc.documentInfo.systemName} (Copy)`,
      },
    };

    await idbSaveDocument(duplicated);
    await refreshDocumentsList();

    // Reset status on duplicate — always starts as draft
    const resetDup = { ...duplicated, status: 'draft' as const, lockedAt: null, lockedBy: null, lockedByDisplayName: null };
    await idbSaveDocument(resetDup);
    return resetDup;
  }, [persist, refreshDocumentsList]);

  // ── Document lifecycle ──────────────────────────────────────────────
  const submitForReview = useCallback(async () => {
    if (!report || report.status !== 'draft') return;
    const updated = produce(report, (d) => {
      d.status = 'under_review';
      d.updatedAt = new Date().toISOString();
    });
    setReport(updated);
    if (persist) {
      await idbSaveDocument(updated);
      await refreshDocumentsList();
    }
  }, [report, persist, refreshDocumentsList]);

  const lockDocument = useCallback(async (userId: string, displayName: string) => {
    if (!report) return;
    const now = new Date().toISOString();
    const updated = produce(report, (d) => {
      d.status = 'approved';
      d.lockedAt = now;
      d.lockedBy = userId;
      d.lockedByDisplayName = displayName;
      d.updatedAt = now;
    });
    setReport(updated);
    if (persist) {
      await idbSaveDocument(updated);
      await refreshDocumentsList();
    }
  }, [report, persist, refreshDocumentsList]);

  const unlockDocument = useCallback(async () => {
    if (!report) return;
    const updated = produce(report, (d) => {
      d.status = 'draft';
      d.lockedAt = null;
      d.lockedBy = null;
      d.lockedByDisplayName = null;
      d.updatedAt = new Date().toISOString();
    });
    setReport(updated);
    if (persist) {
      await idbSaveDocument(updated);
      await refreshDocumentsList();
    }
  }, [report, persist, refreshDocumentsList]);

  const isLocked = report?.status === 'approved';

  const value = useMemo(
    () => ({
      report,
      allDocuments,
      loadingDocs,
      update,
      resetReport,
      replaceReport,
      openDocument,
      createDocument,
      deleteDoc,
      duplicateDoc,
      submitForReview,
      lockDocument,
      unlockDocument,
      isLocked,
    }),
    [
      report,
      allDocuments,
      loadingDocs,
      update,
      resetReport,
      replaceReport,
      openDocument,
      createDocument,
      deleteDoc,
      duplicateDoc,
      submitForReview,
      lockDocument,
      unlockDocument,
      isLocked,
    ],
  );

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return ctx;
}
