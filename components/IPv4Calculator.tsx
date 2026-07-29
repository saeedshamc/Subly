'use client';

import { useMemo, useState } from 'react';
import { calculateSubnet } from '../lib/subnet-engine/ipv4';
import { validateIPv4Input, normalizeMaskInput } from '../lib/subnet-engine/validation';
import type { SubnetResult } from '../lib/subnet-engine/types';
import { useTranslation } from '../lib/i18n/I18nProvider';
import ResultField from './ResultField';
import CopyButton from './CopyButton';
import BinaryVisualizer from './BinaryVisualizer';
import { downloadCsv } from '../lib/utils/csv';
import { exportToPdf } from '../lib/utils/pdf';

export default function IPv4Calculator() {
  const { t } = useTranslation();
  const [ip, setIp] = useState('192.168.1.10');
  const [maskInput, setMaskInput] = useState('24');
  const [showWork, setShowWork] = useState(false);
  const [submitted, setSubmitted] = useState(true);

  const validation = useMemo(() => validateIPv4Input(ip, maskInput), [ip, maskInput]);

  const result: SubnetResult | null = useMemo(() => {
    if (!submitted || !validation.valid) return null;
    const cidr = normalizeMaskInput(maskInput);
    if (cidr === null) return null;
    try {
      return calculateSubnet(ip.trim(), cidr);
    } catch {
      return null;
    }
  }, [submitted, validation.valid, ip, maskInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const summaryText = result
    ? [
        `${t('ipv4.ipAddress')}: ${result.input.ip}`,
        `${t('ipv4.networkAddress')}: ${result.networkAddress}`,
        `${t('ipv4.broadcastAddress')}: ${result.broadcastAddress}`,
        `${t('ipv4.subnetMask')}: ${result.subnetMask} (/${result.cidr})`,
        `${t('ipv4.wildcardMask')}: ${result.wildcardMask}`,
        `${t('ipv4.firstUsableHost')}: ${result.firstUsableHost ?? '-'}`,
        `${t('ipv4.lastUsableHost')}: ${result.lastUsableHost ?? '-'}`,
        `${t('ipv4.usableHosts')}: ${result.usableHosts}`,
        `${t('ipv4.addressClass')}: ${result.addressClass}`,
      ].join('\n')
    : '';

  const handleExportCsv = () => {
    if (!result) return;
    downloadCsv('ipv4-subnet-result', [
      {
        [t('ipv4.ipAddress')]: result.input.ip,
        [t('ipv4.networkAddress')]: result.networkAddress,
        [t('ipv4.broadcastAddress')]: result.broadcastAddress,
        [t('ipv4.subnetMask')]: result.subnetMask,
        [t('ipv4.cidr')]: `/${result.cidr}`,
        [t('ipv4.wildcardMask')]: result.wildcardMask,
        [t('ipv4.firstUsableHost')]: result.firstUsableHost ?? '',
        [t('ipv4.lastUsableHost')]: result.lastUsableHost ?? '',
        [t('ipv4.usableHosts')]: result.usableHosts,
        [t('ipv4.addressClass')]: result.addressClass,
      },
    ]);
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportToPdf({
      title: t('ipv4.heading'),
      subtitle: `${result.input.ip}/${result.input.cidr}`,
      columns: [t('ipv4.networkAddress'), t('ipv4.broadcastAddress'), t('ipv4.subnetMask'), t('ipv4.firstUsableHost'), t('ipv4.lastUsableHost'), t('ipv4.usableHosts')],
      rows: [[result.networkAddress, result.broadcastAddress, `${result.subnetMask} (/${result.cidr})`, result.firstUsableHost ?? '-', result.lastUsableHost ?? '-', result.usableHosts]],
      filename: 'ipv4-subnet-result',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h2 className="mb-4 text-base font-semibold">{t('ipv4.heading')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('ipv4.ipAddress')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={ip}
              onChange={(e) => {
                setIp(e.target.value);
                setSubmitted(false);
              }}
              placeholder={t('ipv4.ipPlaceholder')}
              inputMode="decimal"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('ipv4.maskOrCidr')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={maskInput}
              onChange={(e) => {
                setMaskInput(e.target.value);
                setSubmitted(false);
              }}
              placeholder={t('ipv4.maskPlaceholder')}
            />
          </label>
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {t('common.calculate')}
          </button>
        </form>

        {!validation.valid && (submitted || ip || maskInput) && (
          <ul className="mt-3 flex flex-col gap-1 text-sm" style={{ color: 'var(--danger)' }}>
            {validation.errors.map((err) => (
              <li key={err.field}>{t(err.messageKey, err.params)}</li>
            ))}
          </ul>
        )}
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
                {t('common.results')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowWork((v) => !v)}
                  className="rounded-md border px-2.5 py-1 text-xs"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {showWork ? t('common.hideWork') : t('common.showWork')}
                </button>
                <CopyButton value={summaryText} label={t('common.copyAll')} />
                <button type="button" onClick={handleExportCsv} className="rounded-md border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--border)' }}>
                  {t('common.exportCsv')}
                </button>
                <button type="button" onClick={handleExportPdf} className="rounded-md border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--border)' }}>
                  {t('common.exportPdf')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <ResultField label={t('ipv4.networkAddress')} value={result.networkAddress} />
              <ResultField label={t('ipv4.broadcastAddress')} value={result.broadcastAddress} />
              <ResultField label={t('ipv4.subnetMask')} value={`${result.subnetMask} (/${result.cidr})`} />
              <ResultField label={t('ipv4.wildcardMask')} value={result.wildcardMask} />
              <ResultField label={t('ipv4.firstUsableHost')} value={result.firstUsableHost ?? '-'} />
              <ResultField label={t('ipv4.lastUsableHost')} value={result.lastUsableHost ?? '-'} />
              <ResultField label={t('ipv4.totalHosts')} value={result.totalHosts} mono={false} />
              <ResultField label={t('ipv4.usableHosts')} value={result.usableHosts} mono={false} />
              <ResultField label={t('ipv4.addressClass')} value={result.addressClass} mono={false} />
              <ResultField
                label={t('ipv4.addressType')}
                value={result.addressTypeInfo.types.map((ty) => t(`addressTypes.${ty}`)).join(', ')}
                mono={false}
              />
            </div>
          </div>

          {showWork && <BinaryVisualizer result={result} />}
        </div>
      )}
    </div>
  );
}
