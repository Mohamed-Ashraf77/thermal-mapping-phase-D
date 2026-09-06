import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { DateInput, ImageUploadInput, TextInput } from '../ui/Field';

export function DocumentInfoForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const info = report.documentInfo;

  return (
    <SectionCard
      title="Document & Cover Page"
      description="These fields populate the report cover page, running header, and footer on every page."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Report title"
          value={info.reportTitle}
          onChange={(v) => update((r) => { r.documentInfo.reportTitle = v; })}
        />
        <TextInput
          label="System name"
          value={info.systemName}
          onChange={(v) => update((r) => { r.documentInfo.systemName = v; })}
          hint='e.g. "Long Term Walk-In Stability Chamber"'
        />
        <TextInput
          label="System code"
          value={info.systemCode}
          onChange={(v) => update((r) => { r.documentInfo.systemCode = v; })}
          hint='e.g. "QC-STB-01"'
        />
        <TextInput
          label="Document number"
          value={info.documentNumber}
          onChange={(v) => update((r) => { r.documentInfo.documentNumber = v; })}
        />
        <TextInput
          label="Revision number"
          value={info.revisionNumber}
          onChange={(v) => update((r) => { r.documentInfo.revisionNumber = v; })}
        />
        <TextInput
          label="Form reference"
          value={info.formReference}
          onChange={(v) => update((r) => { r.documentInfo.formReference = v; })}
          hint='e.g. "F-8.1.0/105"'
        />
        <DateInput
          label="Issue date"
          value={info.issueDate}
          onChange={(v) => update((r) => { r.documentInfo.issueDate = v; })}
        />
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Client company"
          value={info.clientName}
          onChange={(v) => update((r) => { r.documentInfo.clientName = v; })}
        />
        <TextInput
          label="Client site"
          value={info.clientSite}
          onChange={(v) => update((r) => { r.documentInfo.clientSite = v; })}
        />
        <ImageUploadInput
          label="Client logo"
          value={info.clientLogoDataUrl}
          onChange={(v) => update((r) => { r.documentInfo.clientLogoDataUrl = v; })}
        />
        <TextInput
          label="Performing company"
          value={info.performingCompanyName}
          onChange={(v) => update((r) => { r.documentInfo.performingCompanyName = v; })}
        />
        <ImageUploadInput
          label="Performing company logo"
          value={info.performingCompanyLogoDataUrl}
          onChange={(v) => update((r) => { r.documentInfo.performingCompanyLogoDataUrl = v; })}
        />
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Contact email"
          value={info.contactEmail}
          onChange={(v) => update((r) => { r.documentInfo.contactEmail = v; })}
        />
        <TextInput
          label="Contact phones (comma separated)"
          value={info.contactPhones.join(', ')}
          onChange={(v) =>
            update((r) => {
              r.documentInfo.contactPhones = v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            })
          }
        />
        <TextInput
          label="Address lines (comma separated)"
          className="sm:col-span-2"
          value={info.contactAddressLines.join(', ')}
          onChange={(v) =>
            update((r) => {
              r.documentInfo.contactAddressLines = v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            })
          }
        />
      </div>
    </SectionCard>
  );
}
