import { Fragment } from 'react';
import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';
import type { LoadingItem } from '../../types/report';

const ROWS_PER_PAGE = 32;

export function chunkLoadingItems(items: LoadingItem[]): LoadingItem[][] {
  if (items.length === 0) return [[]];
  const chunks: LoadingItem[][] = [];
  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    chunks.push(items.slice(i, i + ROWS_PER_PAGE));
  }
  return chunks;
}

function LoadingTable({ chunk, startIndex }: { chunk: LoadingItem[]; startIndex: number }) {
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">#</th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
            Row Label
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-right font-semibold text-slate-600">
            Sum of Number of boxes
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-right font-semibold text-slate-600">
            Box volume (mm³)
          </th>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-right font-semibold text-slate-600">
            Volume per product (Liter)
          </th>
        </tr>
      </thead>
      <tbody>
        {chunk.length === 0 ? (
          <tr>
            <td colSpan={5} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
              No loading items entered yet.
            </td>
          </tr>
        ) : (
          chunk.map((item, i) => (
            <tr key={item.id}>
              <td className="border border-slate-300 px-2 py-1 text-slate-500">{startIndex + i + 1}</td>
              <td className="border border-slate-300 px-2 py-1 text-slate-700">{item.rowLabel || '—'}</td>
              <td className="border border-slate-300 px-2 py-1 text-right text-slate-700">
                {item.numberOfBoxes.toLocaleString()}
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right text-slate-700">
                {item.boxVolumeMm3.toLocaleString()}
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right text-slate-700">
                {item.volumePerProductLiters.toFixed(4)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function LoadingDescriptionPages(props: { startPageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const chunks = chunkLoadingItems(report.loadingItems);

  return (
    <>
      {chunks.map((chunk, idx) => (
        <Fragment key={idx}>
          <ReportPageFrame pageNumber={props.startPageNumber + idx} totalPages={props.totalPages}>
            {idx === 0 && <h3 className="mb-4 text-xs font-bold text-slate-700">13.1.1 Loading Description</h3>}
            <LoadingTable chunk={chunk} startIndex={idx * ROWS_PER_PAGE} />
          </ReportPageFrame>
        </Fragment>
      ))}
    </>
  );
}
