import { lazy, Suspense } from "react";
import type { FormattedTextareaProps } from "./FormattedTextareaEditor";

const LazyFormattedTextareaEditor = lazy(() => import("./FormattedTextareaEditor"));

export default function FormattedTextarea({
  value,
  onChange,
  rows,
  required,
  placeholder,
  className,
}: FormattedTextareaProps) {
  return (
    <Suspense fallback={<div className={className ?? "space-y-2"}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 4}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
      />
      <p className="text-xs text-slate-500">Loading rich editor...</p>
    </div>}
    >
      <LazyFormattedTextareaEditor
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className={className}
      />
    </Suspense>
  );
}