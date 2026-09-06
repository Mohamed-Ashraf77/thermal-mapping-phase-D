import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

interface PrintJob {
  report: unknown;
  sensors: unknown;
  createdAt: number;
}

interface CalibrationRecordLike {
  certificateFileName?: string | null;
  certificateDataUrl?: string | null;
}

const JOB_TTL_MS = 10 * 60 * 1000; // 10 minutes
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(text);
}

/** Matches "/api/print-jobs/<id>" style paths and returns the captured id. */
function matchId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  return /^[A-Za-z0-9-]+$/.test(rest) ? rest : null;
}

function extractCalibrationRecords(report: unknown): CalibrationRecordLike[] {
  if (!report || typeof report !== 'object') return [];
  const records = (report as { calibrationRecords?: unknown }).calibrationRecords;
  return Array.isArray(records) ? (records as CalibrationRecordLike[]) : [];
}

/** Appends each calibration record's uploaded certificate as extra pages at
 * the end of the generated report PDF — PDF certificates have their pages
 * copied directly; image certificates (png/jpg) are centered on a new A4
 * page. Failures on any single certificate are logged and skipped rather
 * than failing the whole export.
 */
async function mergeCalibrationCertificates(reportPdfBytes: Uint8Array, records: CalibrationRecordLike[]): Promise<Uint8Array> {
  const withCerts = records.filter((r) => !!r.certificateDataUrl);
  if (withCerts.length === 0) return reportPdfBytes;

  const { PDFDocument } = await import('pdf-lib');
  const mainDoc = await PDFDocument.load(reportPdfBytes);

  for (const rec of withCerts) {
    const dataUrl = rec.certificateDataUrl as string;
    const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
    if (!match) continue;
    const [, mime, base64] = match;
    const bytes = Buffer.from(base64, 'base64');

    try {
      if (mime === 'application/pdf') {
        const certDoc = await PDFDocument.load(bytes);
        const copiedPages = await mainDoc.copyPages(certDoc, certDoc.getPageIndices());
        copiedPages.forEach((p) => mainDoc.addPage(p));
      } else if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') {
        const image = mime === 'image/png' ? await mainDoc.embedPng(bytes) : await mainDoc.embedJpg(bytes);
        const page = mainDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
        const scale = Math.min((A4_WIDTH_PT * 0.9) / image.width, (A4_HEIGHT_PT * 0.9) / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        page.drawImage(image, { x: (A4_WIDTH_PT - w) / 2, y: (A4_HEIGHT_PT - h) / 2, width: w, height: h });
      }
      // Other mime types (e.g. heic) are silently skipped — not supported by pdf-lib's embedder.
    } catch (err) {
      // A single unreadable certificate shouldn't sink the whole export.
      console.error(`[pdf-export] Skipping certificate "${rec.certificateFileName ?? 'unnamed'}":`, err);
    }
  }

  return mainDoc.save();
}

export function pdfExportPlugin(): Plugin {
  const jobs = new Map<string, PrintJob>();

  function cleanupExpiredJobs() {
    const now = Date.now();
    for (const [id, job] of jobs) {
      if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
    }
  }

  return {
    name: 'pdf-export-plugin',
    configureServer(server: ViteDevServer) {
      const interval = setInterval(cleanupExpiredJobs, 60_000);
      server.httpServer?.once('close', () => clearInterval(interval));

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://internal');
        const pathname = url.pathname;

        try {
          // 1. Store the current report + sensor data for the print route to fetch.
          if (req.method === 'POST' && pathname === '/api/print-jobs') {
            const body = (await readJsonBody(req)) as { report: unknown; sensors: unknown };
            const id = randomUUID();
            jobs.set(id, { report: body.report, sensors: body.sensors, createdAt: Date.now() });
            sendJson(res, 200, { id });
            return;
          }

          // 2. The /print/:id hydration route fetches its data from here.
          const getId = req.method === 'GET' ? matchId(pathname, '/api/print-jobs/') : null;
          if (getId) {
            const job = jobs.get(getId);
            if (!job) {
              sendJson(res, 404, { error: 'Print job not found or expired.' });
              return;
            }
            sendJson(res, 200, { report: job.report, sensors: job.sensors });
            return;
          }

          // 3. Launch Puppeteer against our own /print/:id route and return a PDF.
          const genId = req.method === 'POST' ? matchId(pathname, '/api/generate-pdf/') : null;
          if (genId) {
            const job = jobs.get(genId);
            if (!job) {
              sendJson(res, 404, { error: 'Print job not found or expired. Try again.' });
              return;
            }

            const host = req.headers.host ?? 'localhost:5173';
            const printUrl = `http://${host}/print/${genId}`;

            let puppeteer;
            try {
              puppeteer = await import('puppeteer');
            } catch {
              sendJson(res, 500, {
                error:
                  "Puppeteer isn't installed. Run 'npm install' (it downloads a bundled Chromium the first time) and restart the dev server.",
              });
              return;
            }

            const browser = await puppeteer.default.launch({ headless: true });
            try {
              const page = await browser.newPage();
              await page.setViewport({ width: 900, height: 1200 });
              await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 60_000 });
              await page.waitForSelector('[data-report-ready="true"]', { timeout: 30_000 });
              await page.emulateMediaType('print');
              const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
              });

              let finalBytes: Uint8Array = pdfBuffer;
              try {
                const calibrationRecords = extractCalibrationRecords(job.report);
                finalBytes = await mergeCalibrationCertificates(pdfBuffer, calibrationRecords);
              } catch (mergeErr) {
                // If certificate merging fails for any reason, still return the
                // base report rather than losing the whole export.
                console.error('[pdf-export] Certificate merge failed, returning report without certificates:', mergeErr);
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="thermal-validation-report.pdf"');
              res.end(Buffer.from(finalBytes));
            } finally {
              await browser.close();
              jobs.delete(genId);
            }
            return;
          }
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'Unknown server error.' });
          return;
        }

        next();
      });
    },
  };
}
