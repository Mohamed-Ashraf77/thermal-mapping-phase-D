import { useEffect, useState } from 'react';
import { ReportProvider } from '../store/ReportContext';
import { AnalysisProvider } from '../store/AnalysisContext';
import { ReportPreview } from '../components/report/ReportPreview';
import type { ReportDocument } from '../types/report';
import type { SensorData } from '../lib/analysis';

function isPrintAutoOpen(): boolean {
  return new URLSearchParams(window.location.search).get('autoPrint') === '1';
}

function getJobFromSessionStorage(jobId: string): { report: ReportDocument; sensors: SensorData[] } | null {
  try {
    const raw = sessionStorage.getItem(`thermal-print-job:${jobId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { report?: ReportDocument; sensors?: SensorData[] };
    if (!parsed.report) return null;
    return { report: parsed.report, sensors: parsed.sensors ?? [] };
  } catch {
    return null;
  }
}

function ReadySignal() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function waitUntilSettled() {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
        ),
      );
      // Give chart components (ResizeObserver-based) a couple of frames to
      // finish measuring and drawing before we tell Puppeteer we're ready.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!cancelled) setReady(true);
    }
    waitUntilSettled();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPrintAutoOpen()) return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;
  // Presence of this element (any visibility) is the signal Puppeteer waits
  // for via page.waitForSelector('[data-report-ready="true"]').
  return <div data-report-ready="true" style={{ display: 'none' }} />;
}

export function PrintRoute({ jobId }: { jobId: string }) {
  const [data, setData] = useState<{ report: ReportDocument; sensors: SensorData[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      try {
        const res = await fetch(`/api/print-jobs/${jobId}`);
        const contentType = res.headers.get('content-type') ?? '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (!cancelled) {
            setData({ report: json.report as ReportDocument, sensors: (json.sensors ?? []) as SensorData[] });
          }
          return;
        }

        // Non-JSON (e.g. a static-host SPA rewrite serving index.html) or a
        // non-OK response both mean there's no real print-job backend or the
        // job wasn't found — fall back to the client-side session copy used
        // by the "open print dialog" fallback path.
        const fallback = getJobFromSessionStorage(jobId);
        if (!fallback) {
          throw new Error(`Print job not found or expired (HTTP ${res.status}).`);
        }
        if (!cancelled) setData(fallback);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load print job.');
        }
      }
    }

    void loadJob();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (error) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#b91c1c' }}>{error}</div>;
  }
  if (!data) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#475569' }}>Loading report data…</div>;
  }

  return (
    <ReportProvider initialReport={data.report} persist={false}>
      <AnalysisProvider initialSensors={data.sensors} persist={false}>
        {isPrintAutoOpen() && (
          <div
            className="print:hidden"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              background: '#1e293b',
              color: '#fff',
              padding: '10px 16px',
              fontFamily: 'sans-serif',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            The print dialog will open automatically. Choose <strong>&quot;Save as PDF&quot;</strong> as the destination to
            download this report as a PDF file.
          </div>
        )}
        <ReportPreview />
        <ReadySignal />
      </AnalysisProvider>
    </ReportProvider>
  );
}
