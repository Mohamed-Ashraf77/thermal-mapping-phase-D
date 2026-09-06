import type { ReactNode } from 'react';

interface FieldWrapperProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({ label, hint, required, children, className }: FieldWrapperProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 flex items-baseline gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100';

export function TextInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  const { label, value, onChange, placeholder, required, hint, className } = props;
  return (
    <FieldWrapper label={label} required={required} hint={hint} className={className}>
      <input
        type="text"
        className={inputBase}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldWrapper>
  );
}

export function DateInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  const { label, value, onChange, required, className } = props;
  return (
    <FieldWrapper label={label} required={required} className={className}>
      <input type="date" className={inputBase} value={value} onChange={(e) => onChange(e.target.value)} />
    </FieldWrapper>
  );
}

export function NumberInput(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
  className?: string;
}) {
  const { label, value, onChange, step, hint, className } = props;
  return (
    <FieldWrapper label={label} hint={hint} className={className}>
      <input
        type="number"
        step={step ?? 1}
        className={inputBase}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </FieldWrapper>
  );
}

export function TextAreaInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  const { label, value, onChange, rows, className } = props;
  return (
    <FieldWrapper label={label} className={className}>
      <textarea
        className={`${inputBase} resize-y`}
        rows={rows ?? 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldWrapper>
  );
}

export function ImageUploadInput(props: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  className?: string;
}) {
  const { label, value, onChange, className } = props;

  function handleFile(file: File | null) {
    if (!file) {
      onChange(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <FieldWrapper label={label} className={className}>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt={label} className="h-14 w-14 rounded border border-slate-200 object-contain bg-white" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
            No image
          </div>
        )}
        <div className="flex flex-col gap-1">
          <input
            type="file"
            accept="image/*"
            className="text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="self-start text-xs font-medium text-rose-500 hover:text-rose-600"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
    </FieldWrapper>
  );
}
