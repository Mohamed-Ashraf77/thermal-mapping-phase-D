import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SensorData } from '../lib/analysis';
import { parseSensorCsv } from '../lib/analysis';
import { idbClear, idbDelete, idbGetAll, idbPut, isIndexedDbAvailable } from '../lib/idbStore';

interface AnalysisContextValue {
  sensors: SensorData[];
  /** True while the initial IndexedDB load is in flight. */
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
}: {
  children: ReactNode;
  /** When provided, seeds state with this list instead of reading
   * IndexedDB — used by the /print/:id hydration route. */
  initialSensors?: SensorData[];
  /** When false, never reads or writes IndexedDB. */
  persist?: boolean;
}) {
  const [sensors, setSensors] = useState<SensorData[]>(initialSensors ?? []);
  const [loading, setLoading] = useState(persist && !initialSensors);

  // Load any previously uploaded sensor CSVs from IndexedDB on first mount,
  // so a refresh no longer loses the data you spent time uploading.
  useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    async function load() {
      if (!isIndexedDbAvailable()) {
        setLoading(false);
        return;
      }
      try {
        const stored = await idbGetAll<SensorData>();
        if (!cancelled) setSensors(stored);
      } catch {
        // IndexedDB can fail in some locked-down environments — the app
        // still works, uploads just won't survive a refresh in that case.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => /\.csv$/i.test(f.name));
    const parsed = await Promise.all(
      fileArray.map(
        (file) =>
          new Promise<SensorData>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(parseSensorCsv(file.name, String(reader.result ?? '')));
            reader.onerror = () =>
              resolve({ id: file.name.replace(/\.csv$/i, ''), rows: [], error: 'Could not read file.' });
            reader.readAsText(file);
          }),
      ),
    );

    setSensors((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      parsed.forEach((s) => byId.set(s.id, s));
      return Array.from(byId.values());
    });

    if (persist && isIndexedDbAvailable()) {
      await Promise.all(parsed.map((s) => idbPut(s))).catch(() => {
        // Non-fatal — the in-memory state above still has the data for
        // this session even if persisting it failed.
      });
    }
  }, [persist]);

  const removeSensor = useCallback((id: string) => {
    setSensors((prev) => prev.filter((s) => s.id !== id));
    if (persist && isIndexedDbAvailable()) {
      idbDelete(id).catch(() => {});
    }
  }, [persist]);

  const clearAll = useCallback(() => {
    setSensors([]);
    if (persist && isIndexedDbAvailable()) {
      idbClear().catch(() => {});
    }
  }, [persist]);

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
