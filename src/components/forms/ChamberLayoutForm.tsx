import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Trash2, Upload, X } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { TextInput } from '../ui/Field';
import { createId } from '../../utils/id';

const cellInput =
  'w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ChamberLayoutForm() {
  const { report, update } = useReport();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const [placing, setPlacing] = useState(false);
  if (!report) return null;
  const layout = report.chamberLayout;

  async function handleLayoutImage(file: File | null) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    update((r) => {
      r.chamberLayout.layoutImageDataUrl = dataUrl;
    });
  }

  async function handlePhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const dataUrls = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    update((r) => {
      dataUrls.forEach((dataUrl) => {
        r.chamberLayout.photos.push({ id: createId('photo'), dataUrl, caption: '' });
      });
    });
  }

  function handleImageClick(e: MouseEvent<HTMLDivElement>) {
    if (!placing || !imageWrapRef.current) return;
    const rect = imageWrapRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const nextPosition = layout.dataloggers.length + 1;
    update((r) => {
      r.chamberLayout.dataloggers.push({
        id: createId('dl'),
        positionNumber: nextPosition,
        serialNumber: '',
        xPct: Math.min(98, Math.max(2, xPct)),
        yPct: Math.min(98, Math.max(2, yPct)),
        zone: 'custom',
        note: '',
      });
    });
  }

  function updateMarker(id: string, patch: Partial<{ positionNumber: number; serialNumber: string; note: string }>) {
    update((r) => {
      const dl = r.chamberLayout.dataloggers.find((d) => d.id === id);
      if (dl) Object.assign(dl, patch);
    });
  }

  function removeMarker(id: string) {
    update((r) => {
      r.chamberLayout.dataloggers = r.chamberLayout.dataloggers.filter((d) => d.id !== id);
    });
  }

  function removePhoto(id: string) {
    update((r) => {
      r.chamberLayout.photos = r.chamberLayout.photos.filter((p) => p.id !== id);
    });
  }

  return (
    <SectionCard
      title="Chamber Layout & Datalogger Positions"
      description="Populates Section 13.1.2 (layout diagram) and 13.1.3 (photos). Upload a floor-plan image, then click it to drop numbered markers."
      actions={
        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleLayoutImage(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Upload className="h-3.5 w-3.5" /> Upload layout image
          </button>
        </div>
      }
    >
      {!layout.layoutImageDataUrl ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
          No layout image uploaded yet.
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={placing}
                onChange={(e) => setPlacing(e.target.checked)}
                className="rounded border-slate-300"
              />
              Click on the image to add the next numbered marker (
              {placing ? 'placing mode on' : 'placing mode off'})
            </label>
            <button
              type="button"
              onClick={() => update((r) => { r.chamberLayout.layoutImageDataUrl = null; })}
              className="text-xs font-medium text-rose-500 hover:text-rose-600"
            >
              Remove image
            </button>
          </div>

          <div
            ref={imageWrapRef}
            onClick={handleImageClick}
            className={`relative w-full overflow-hidden rounded-lg border border-slate-200 ${placing ? 'cursor-crosshair' : ''}`}
          >
            <img src={layout.layoutImageDataUrl} alt="Chamber layout" className="block w-full select-none" draggable={false} />
            {layout.dataloggers.map((dl) => (
              <div
                key={dl.id}
                style={{ left: `${dl.xPct}%`, top: `${dl.yPct}%` }}
                className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-[11px] font-bold text-white shadow"
                title={dl.serialNumber || `Position ${dl.positionNumber}`}
              >
                {dl.positionNumber}
              </div>
            ))}
          </div>
        </>
      )}

      {layout.dataloggers.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">#</th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Serial number
                </th>
                <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {layout.dataloggers
                .slice()
                .sort((a, b) => a.positionNumber - b.positionNumber)
                .map((dl) => (
                  <tr key={dl.id}>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className={cellInput}
                        value={dl.positionNumber}
                        onChange={(e) => updateMarker(dl.id, { positionNumber: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={cellInput}
                        value={dl.serialNumber}
                        onChange={(e) => updateMarker(dl.id, { serialNumber: e.target.value })}
                        placeholder="e.g. TZ0322040121"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={cellInput}
                        value={dl.note}
                        onChange={(e) => updateMarker(dl.id, { note: e.target.value })}
                        placeholder="e.g. Near door, top shelf"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeMarker(dl.id)}
                        className="text-slate-400 hover:text-rose-500"
                        aria-label="Remove marker"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="my-5 h-px bg-slate-100" />

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chamber photos</h3>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePhotos(e.target.files)}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Upload className="h-3.5 w-3.5" /> Add photos
        </button>
      </div>

      {layout.photos.length === 0 ? (
        <p className="text-xs text-slate-400">No photos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {layout.photos.map((photo) => (
            <div key={photo.id} className="relative rounded-lg border border-slate-200 p-2">
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-400 shadow hover:text-rose-500"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <img src={photo.dataUrl} alt="Chamber" className="h-28 w-full rounded object-cover" />
              <TextInput
                label="Caption"
                value={photo.caption}
                onChange={(v) =>
                  update((r) => {
                    const p = r.chamberLayout.photos.find((ph) => ph.id === photo.id);
                    if (p) p.caption = v;
                  })
                }
                className="mt-2"
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
