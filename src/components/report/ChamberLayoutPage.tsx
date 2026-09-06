import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

export function ChamberLayoutPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const layout = report.chamberLayout;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h3 className="mb-4 text-xs font-bold text-slate-700">
        13.1.2 Stability Chamber Layout &amp; Distribution of Dataloggers
      </h3>

      {layout.layoutImageDataUrl ? (
        <div className="relative w-full overflow-hidden rounded border border-slate-200">
          <img src={layout.layoutImageDataUrl} alt="Chamber layout" className="block w-full" />
          {layout.dataloggers.map((dl) => (
            <div
              key={dl.id}
              style={{ left: `${dl.xPct}%`, top: `${dl.yPct}%` }}
              className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-slate-700 text-[10px] font-bold text-white shadow"
            >
              {dl.positionNumber}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">
          No layout image uploaded.
        </div>
      )}
    </ReportPageFrame>
  );
}

export function ChamberPhotosPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const photos = report.chamberLayout.photos;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h3 className="mb-4 text-xs font-bold text-slate-700">13.1.3 Stability Chamber Photos</h3>
      {photos.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">
          No photos uploaded.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {photos.map((photo) => (
            <figure key={photo.id} className="rounded border border-slate-200 p-1">
              <img src={photo.dataUrl} alt={photo.caption || 'Chamber photo'} className="h-40 w-full rounded object-cover" />
              {photo.caption && <figcaption className="mt-1 text-center text-[10px] text-slate-500">{photo.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </ReportPageFrame>
  );
}
