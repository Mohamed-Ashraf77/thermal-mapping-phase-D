import { useEffect, useState } from 'react';
import { ReportProvider } from '../store/ReportContext';
import { AnalysisProvider } from '../store/AnalysisContext';
import { ReportPreview } from '../components/report/ReportPreview';
import type { ReportDocument } from '../types/report';
import type { SensorData } from '../lib/analysis';

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
    fetch(`/api/print-jobs/${jobId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Print job not found or expired (HTTP ${res.status}).`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData({ report: json.report as ReportDocument, sensors: (json.sensors ?? []) as SensorData[] });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load print job.');
      });
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
        <ReportPreview />
        <ReadySignal />
      </AnalysisProvider>
    </ReportProvider>
  );
}
