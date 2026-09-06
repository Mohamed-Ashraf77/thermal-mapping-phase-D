import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { NumberInput, TextInput } from '../ui/Field';

export function ChamberDescriptionForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const c = report.chamberDescription;

  return (
    <SectionCard
      title="Chamber Description & Acceptance Criteria"
      description="Feeds the System Brief Description (Section 3) and Stability Chamber Description (Section 13.1) pages."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="System name"
          value={c.systemName}
          onChange={(v) => update((r) => { r.chamberDescription.systemName = v; })}
        />
        <TextInput
          label="Code"
          value={c.code}
          onChange={(v) => update((r) => { r.chamberDescription.code = v; })}
          hint='e.g. "QC-STB-01"'
        />
        <TextInput
          label="Manufacturer"
          value={c.manufacturer}
          onChange={(v) => update((r) => { r.chamberDescription.manufacturer = v; })}
        />
        <TextInput
          label="Model"
          value={c.model}
          onChange={(v) => update((r) => { r.chamberDescription.model = v; })}
        />
        <TextInput
          label="Serial number"
          value={c.serialNumber}
          onChange={(v) => update((r) => { r.chamberDescription.serialNumber = v; })}
        />
        <TextInput
          label="Inner size"
          value={c.innerSizeText}
          onChange={(v) => update((r) => { r.chamberDescription.innerSizeText = v; })}
          hint='e.g. "4800 w x 2500 D x 2500 H mm"'
        />
        <TextInput
          label="Location"
          value={c.location}
          onChange={(v) => update((r) => { r.chamberDescription.location = v; })}
        />
        <NumberInput
          label="Number of data loggers"
          value={c.numberOfDataLoggers}
          onChange={(v) => update((r) => { r.chamberDescription.numberOfDataLoggers = v; })}
        />
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Acceptance criteria & setting points
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberInput
          label="Temp min (°C)"
          step={0.1}
          value={c.acceptanceCriteria.temperatureMinC}
          onChange={(v) => update((r) => { r.chamberDescription.acceptanceCriteria.temperatureMinC = v; })}
        />
        <NumberInput
          label="Temp max (°C)"
          step={0.1}
          value={c.acceptanceCriteria.temperatureMaxC}
          onChange={(v) => update((r) => { r.chamberDescription.acceptanceCriteria.temperatureMaxC = v; })}
        />
        <NumberInput
          label="Humidity min (%)"
          step={0.1}
          value={c.acceptanceCriteria.humidityMinPct}
          onChange={(v) => update((r) => { r.chamberDescription.acceptanceCriteria.humidityMinPct = v; })}
        />
        <NumberInput
          label="Humidity max (%)"
          step={0.1}
          value={c.acceptanceCriteria.humidityMaxPct}
          onChange={(v) => update((r) => { r.chamberDescription.acceptanceCriteria.humidityMaxPct = v; })}
        />
        <NumberInput
          label="Setting temperature (°C)"
          step={0.1}
          value={c.settingTemperatureC}
          onChange={(v) => update((r) => { r.chamberDescription.settingTemperatureC = v; })}
        />
        <NumberInput
          label="Setting humidity (%)"
          step={0.1}
          value={c.settingHumidityPct}
          onChange={(v) => update((r) => { r.chamberDescription.settingHumidityPct = v; })}
        />
        <NumberInput
          label="Sampling period (hours)"
          value={c.samplingPeriodHours}
          onChange={(v) => update((r) => { r.chamberDescription.samplingPeriodHours = v; })}
        />
        <NumberInput
          label="Sample frequency (minutes)"
          value={c.sampleFrequencyMinutes}
          onChange={(v) => update((r) => { r.chamberDescription.sampleFrequencyMinutes = v; })}
        />
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Loading volume ({c.loadingVolumeLiters.toFixed(2)} L) is calculated automatically from the Loading
        Description table below — use "Sync total to chamber description" there to update it.
      </div>
    </SectionCard>
  );
}
