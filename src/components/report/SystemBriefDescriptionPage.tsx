import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

export function SystemBriefDescriptionPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { chamberDescription: c } = report;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-4 text-sm font-bold text-slate-800">3. System Brief Description</h2>
      <p className="mb-4 text-[11px] text-slate-600">This report is applicable to the system mentioned below:</p>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-600">
              Name of System
            </th>
            <th colSpan={2} className="border border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-slate-600">
              Acceptance Criteria
            </th>
          </tr>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-slate-600">Temperature [°C]</th>
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-slate-600">Relative Humidity [%]</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-3 py-4">{c.systemName || '—'}</td>
            <td className="border border-slate-300 px-3 py-4 text-center">
              ({c.acceptanceCriteria.temperatureMinC} – {c.acceptanceCriteria.temperatureMaxC}) °C
            </td>
            <td className="border border-slate-300 px-3 py-4 text-center">
              ({c.acceptanceCriteria.humidityMinPct} – {c.acceptanceCriteria.humidityMaxPct}) %
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-sm font-bold text-slate-800">7. Acceptance Criteria</h2>
      <p className="text-[11px] text-slate-600">
        Temperature recorded continuously for 1 day at a {report.chamberDescription.sampleFrequencyMinutes}-minute
        interval; the chamber should read ({c.acceptanceCriteria.temperatureMinC} – {c.acceptanceCriteria.temperatureMaxC}) °C.
        Relative humidity recorded on the same schedule should read ({c.acceptanceCriteria.humidityMinPct} –{' '}
        {c.acceptanceCriteria.humidityMaxPct}) %.
      </p>
    </ReportPageFrame>
  );
}
