import { useReport } from '../../store/ReportContext';
import { ReportPageFrame } from './ReportPageFrame';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-1/3 border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-600">{label}</td>
      <td className="border border-slate-300 px-3 py-2 text-slate-700">{value || '—'}</td>
    </tr>
  );
}

export function StabilityChamberDescriptionPage(props: { pageNumber: number; totalPages: number }) {
  const { report } = useReport();
  if (!report) return null;
  const { chamberDescription: c } = report;

  return (
    <ReportPageFrame pageNumber={props.pageNumber} totalPages={props.totalPages}>
      <h2 className="mb-1 text-sm font-bold text-slate-800">13. Test Results</h2>
      <h3 className="mb-4 text-xs font-bold text-slate-700">13.1 Stability Chamber Description</h3>

      <table className="w-full border-collapse text-[11px]">
        <tbody>
          <Row label="Name of System" value={c.systemName} />
          <Row label="Manufacturing" value={c.manufacturer} />
          <Row label="Model" value={c.model} />
          <Row label="S.N." value={c.serialNumber} />
          <Row label="Inner size" value={c.innerSizeText} />
          <Row label="Code" value={c.code} />
          <Row label="Location" value={c.location} />
          <Row
            label="Acceptance Criteria"
            value={`(${c.acceptanceCriteria.temperatureMinC} – ${c.acceptanceCriteria.temperatureMaxC}) °C , (${c.acceptanceCriteria.humidityMinPct} – ${c.acceptanceCriteria.humidityMaxPct}) %`}
          />
          <Row label="Setting Temperature" value={`${c.settingTemperatureC} °C , ${c.settingHumidityPct} %RH`} />
          <Row label="No. of D.L." value={`${c.numberOfDataLoggers} D.Ls`} />
          <Row label="Loading Description" value={`${c.loadingVolumeLiters.toFixed(2)} L`} />
          <Row label="Sampling Period" value={`${c.samplingPeriodHours} hrs (1 Cycle)`} />
          <Row label="Sample Frequency" value={`${c.sampleFrequencyMinutes} min`} />
        </tbody>
      </table>
    </ReportPageFrame>
  );
}
