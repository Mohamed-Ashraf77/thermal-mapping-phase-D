import { Plus, Trash2 } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { TextAreaInput } from '../ui/Field';
import { createId } from '../../utils/id';
import type { ResponsibilityItem } from '../../types/report';

function ResponsibilityList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: ResponsibilityItem[];
  onChange: (items: ResponsibilityItem[]) => void;
}) {
  function updateText(id: string, text: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  }
  function addItem() {
    onChange([...items, { id: createId('resp'), text: '' }]);
  }
  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</h3>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="text-xs text-slate-400">No items yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="mt-2 text-slate-300">•</span>
            <input
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100"
              value={item.text}
              onChange={(e) => updateText(item.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="mt-1 text-slate-400 hover:text-rose-500"
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntroductionForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const { introduction, rolesResponsibilities } = report;

  return (
    <SectionCard
      title="Introduction & Roles/Responsibilities"
      description="Populates Section 2 (Introduction, Purpose, Scope) and Section 2.4 (Roles & Responsibilities)."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextAreaInput
          label="Report purpose (2.1)"
          value={introduction.purpose}
          onChange={(v) => update((r) => { r.introduction.purpose = v; })}
          rows={4}
        />
        <TextAreaInput
          label="Report scope (2.2)"
          value={introduction.scope}
          onChange={(v) => update((r) => { r.introduction.scope = v; })}
          rows={4}
        />
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="flex flex-col gap-6">
        <ResponsibilityList
          label="Client — Engineering / Validation"
          items={rolesResponsibilities.clientEngineeringValidation}
          onChange={(items) => update((r) => { r.rolesResponsibilities.clientEngineeringValidation = items; })}
        />
        <ResponsibilityList
          label="Client — Quality"
          items={rolesResponsibilities.clientQuality}
          onChange={(items) => update((r) => { r.rolesResponsibilities.clientQuality = items; })}
        />
        <ResponsibilityList
          label="Performing company"
          items={rolesResponsibilities.performingCompany}
          onChange={(items) => update((r) => { r.rolesResponsibilities.performingCompany = items; })}
        />
      </div>
    </SectionCard>
  );
}
