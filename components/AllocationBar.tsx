import type { VLSMResult } from '../lib/subnet-engine/types';

const PALETTE = ['#2563eb', '#f59e0b', '#16a34a', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#4d7c0f'];

interface AllocationBarProps {
  vlsm: VLSMResult;
}

export default function AllocationBar({ vlsm }: AllocationBarProps) {
  const total = vlsm.totalBaseAddresses;

  const segments = [
    ...vlsm.allocations.map((a, i) => ({
      label: `${a.name} (/${a.cidr})`,
      size: a.blockSize,
      color: PALETTE[i % PALETTE.length],
    })),
    ...vlsm.unallocated.map((u) => ({
      label: `${u.networkAddress}/${u.cidr}`,
      size: u.totalAddresses,
      color: 'transparent',
      unallocated: true,
    })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-8 w-full overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            title={`${seg.label} \u2013 ${seg.size} addresses`}
            className="h-full border-e last:border-e-0"
            style={{
              width: `${(seg.size / total) * 100}%`,
              backgroundColor: 'unallocated' in seg ? 'transparent' : seg.color,
              backgroundImage:
                'unallocated' in seg
                  ? 'repeating-linear-gradient(45deg, var(--border), var(--border) 4px, transparent 4px, transparent 8px)'
                  : undefined,
              borderColor: 'var(--bg)',
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
        {vlsm.allocations.map((a, i) => (
          <span key={a.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            {a.name}
          </span>
        ))}
        {vlsm.unallocated.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm border"
              style={{ borderColor: 'var(--border)' }}
            />
            unallocated
          </span>
        )}
      </div>
    </div>
  );
}
