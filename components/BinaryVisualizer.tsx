import type { SubnetResult } from '../lib/subnet-engine/types';
import { useTranslation } from '../lib/i18n/I18nProvider';

interface BinaryVisualizerProps {
  result: SubnetResult;
}

function BitRow({
  label,
  octets,
  networkBits,
  highlight,
}: {
  label: string;
  octets: string[];
  networkBits: number;
  highlight: 'mask' | 'none';
}) {
  const full = octets.join('');
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-32 shrink-0 text-xs" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </span>
      <div className="force-ltr flex flex-wrap gap-1 font-mono text-sm">
        {octets.map((octet, octetIdx) => (
          <span key={octetIdx} className="flex rounded border px-1" style={{ borderColor: 'var(--border)' }}>
            {octet.split('').map((bit, bitIdx) => {
              const globalIdx = octetIdx * 8 + bitIdx;
              const isNetworkBit = globalIdx < networkBits;
              const color =
                highlight === 'mask'
                  ? isNetworkBit
                    ? 'var(--accent)'
                    : '#f59e0b'
                  : 'var(--fg)';
              return (
                <span key={bitIdx} style={{ color }}>
                  {bit}
                </span>
              );
            })}
          </span>
        ))}
      </div>
      <span className="force-ltr font-mono text-xs" style={{ color: 'var(--fg-muted)' }}>
        {full}
      </span>
    </div>
  );
}

export default function BinaryVisualizer({ result }: BinaryVisualizerProps) {
  const { t } = useTranslation();

  return (
    <div className="card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: 'var(--accent)' }} />
          {t('ipv4.networkBits')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          {t('ipv4.hostBits')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <BitRow label={t('ipv4.ipAddress')} octets={result.binary.ip.octets} networkBits={result.networkBits} highlight="mask" />
        <BitRow label={t('ipv4.subnetMask')} octets={result.binary.mask.octets} networkBits={result.networkBits} highlight="mask" />
      </div>

      <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
        <p>{t('showWork.networkStep')}</p>
        <div className="mt-2">
          <BitRow label={t('ipv4.networkAddress')} octets={result.binary.network.octets} networkBits={result.networkBits} highlight="mask" />
        </div>
      </div>

      <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
        <p>{t('showWork.broadcastStep')}</p>
        <div className="mt-2">
          <BitRow label={t('ipv4.broadcastAddress')} octets={result.binary.broadcast.octets} networkBits={result.networkBits} highlight="mask" />
        </div>
      </div>

      <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
        <p>{t('showWork.wildcardStep')}</p>
        <div className="mt-2">
          <BitRow label={t('ipv4.wildcardMask')} octets={result.binary.wildcard.octets} networkBits={result.networkBits} highlight="mask" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--fg-muted)' }}>
        <span>
          {t('showWork.networkBitsLabel')}: {result.networkBits}
        </span>
        <span>
          {t('showWork.hostBitsLabel')}: {result.hostBits}
        </span>
      </div>
    </div>
  );
}
