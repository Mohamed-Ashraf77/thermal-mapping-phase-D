import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SensorData } from '../lib/analysis';
import { parseSensorCsvMulti } from '../lib/analysis';
import {
  idbClearForDocument,
  idbDelete,
  idbGetAllForDocument,
  idbPut,
  isIndexedDbAvailable,
} from '../lib/idbStore';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  cloudClearSensorFiles,
  cloudDeleteSensorFile,
  cloudGetAllSensorFiles,
  cloudSaveSensorFile,
} from '../lib/supabaseSensorFiles';

interface AnalysisContextValue {
  sensors: SensorData[];
  /** True while the initial sensor data load is in flight. */
  loading: boolean;
  /** Parses and persists newly uploaded CSV files (re-uploading a file with
   * the same name replaces its stored data). */
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeSensor: (id: string) => void;
  clearAll: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({
  children,
  initialSensors,
  persist = true,
  organizationId,
  documentId,
}: {
  children: ReactNode;
  /** When provided, seeds state with this list instead of reading storage —
   * used by the /print/:id hydration route. */
  initialSensors?: SensorData[];
  /** When false, never reads or writes any storage backend. */
  persist?: boolean;
  /** Cloud organization the current document belongs to. When set (and
   * Supabase is configured), sensor files are stored in Supabase scoped to
   * `documentId` so any member of the organization sees the same uploaded
   * data when they open that document. */
  organizationId?: string;
  /** The currently open document's id. Sensor data is always scoped to one
   * document — switching documents shows only that document's own uploads. */
  documentId?: string;
}) {
  const [sensors, setSensors] = useState<SensorData[]>(initialSensors ?? []);
  const [loading, setLoading] = useState(persist && !initialSensors && !!documentId);

  const useCloud = isSupabaseConfigured && !!organizationId;

  // Load any previously uploaded sensor CSVs for the current document, so
  // opening it (from any device/browser, or after a refresh) shows the same
  // data without needing to re-upload.
  useEffect(() => {
    if (!persist || initialSensors) return;
    if (!documentId) {
      setSensors([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const stored = useCloud
          ? await cloudGetAllSensorFiles(organizationId!, documentId!)
          : isIndexedDbAvailable()
            ? await idbGetAllForDocument<SensorData & { documentId?: string }>(documentId!)
            : [];
        if (!cancelled) setSensors(stored);
      } catch (err) {
        console.error('Failed to load sensor files:', err);
        if (!cancelled) setSensors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, documentId, organizationId, useCloud]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    if (!documentId) return;
    const fileArray = Array.from(files).filter((f) => /\.csv$/i.test(f.name));
    const parsedArrays = await Promise.all(
      fileArray.map(
        (file) =>
          new Promise<SensorData[]>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(parseSensorCsvMulti(file.name, String(reader.result ?? '')));
            reader.onerror = () =>
              resolve([{ id: file.name.replace(/\.csv$/i, ''), rows: [], error: 'Could not read file.' }]);
            reader.readAsText(file);
          }),
      ),
    );

    const allParsed = parsedArrays.flat();

    setSensors((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      allParsed.forEach((s) => byId.set(s.id, s));
      return Array.from(byId.values());
    });

    if (persist) {
      if (useCloud) {
        await Promise.all(
          allParsed.map((s) => cloudSaveSensorFile(organizationId!, documentId, s)),
        ).catch((err) => {
          console.error('Failed to save sensor files to cloud:', err);
        });
      } else if (isIndexedDbAvailable()) {
        await Promise.all(
          allParsed.map((s) => idbPut({ ...s, documentId })),
        ).catch(() => {
          // Non-fatal — the in-memory state above still has the data for
          // this session even if persisting it failed.
        });
      }
    }
  }, [persist, useCloud, organizationId, documentId]);

  const removeSensor = useCallback((id: string) => {
    setSensors((prev) => prev.filter((s) => s.id !== id));
    if (persist && documentId) {
      if (useCloud) {
        cloudDeleteSensorFile(organizationId!, documentId, id).catch(() => {});
      } else if (isIndexedDbAvailable()) {
        idbDelete(id).catch(() => {});
      }
    }
  }, [persist, useCloud, organizationId, documentId]);

  const clearAll = useCallback(() => {
    setSensors([]);
    if (persist && documentId) {
      if (useCloud) {
        cloudClearSensorFiles(organizationId!, documentId).catch(() => {});
      } else if (isIndexedDbAvailable()) {
        idbClearForDocument(documentId).catch(() => {});
      }
    }
  }, [persist, useCloud, organizationId, documentId]);

  const value = useMemo(
    () => ({ sensors, loading, addFiles, removeSensor, clearAll }),
    [sensors, loading, addFiles, removeSensor, clearAll],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within an AnalysisProvider');
  return ctx;
}
