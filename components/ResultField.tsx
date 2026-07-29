import CopyButton from './CopyButton';

interface ResultFieldProps {
  label: string;
  value: string | number;
  mono?: boolean;
}

export default function ResultField({ label, value, mono = true }: ResultFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`force-ltr text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
        <CopyButton value={String(value)} small />
      </div>
    </div>
  );
}
