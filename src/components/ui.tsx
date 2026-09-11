'use client';
import type { ReactNode } from 'react';

export function Section({ title, subtitle, children, open = true }: { title: string; subtitle?: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="panel p-4" open={open}>
      <summary className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{title}</span>
        {subtitle && <span className="muted text-xs">{subtitle}</span>}
      </summary>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </details>
  );
}

export function Field({ label, children, hint, full }: { label: string; children: ReactNode; hint?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block mb-1">{label}</label>
      {children}
      {hint && <p className="muted text-xs mt-1">{hint}</p>}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export function Num({ value, onChange, min, max, step = 1, placeholder }: { value: number | '' | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
