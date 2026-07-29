'use client';

import { useMemo, useState } from 'react';
import { calculateFLSM } from '../lib/subnet-engine/flsm';
import { normalizeMaskInput, isValidIPv4, validateSubnetsRequested } from '../lib/subnet-engine/validation';
import { useTranslation } from '../lib/i18n/I18nProvider';
import SubnetTable, { type SubnetTableColumn } from './SubnetTable';
import { downloadCsv } from '../lib/utils/csv';
import { exportToPdf } from '../lib/utils/pdf';
import type { FLSMSubnet } from '../lib/subnet-engine/types';

export default function FLSMCalculator() {
  const { t } = useTranslation();
  const [baseNetwork, setBaseNetwork] = useState('192.168.1.0');
  const [baseCidrInput, setBaseCidrInput] = useState('24');
  const [subnetsRequired, setSubnetsRequired] = useState('5');

  const baseCidr = normalizeMaskInput(baseCidrInput);
  const baseValid = isValidIPv4(baseNetwork.trim()) && baseCidr !== null;
  const subnetsValidation = useMemo(() => validateSubnetsRequested(subnetsRequired), [subnetsRequired]);

  const result = useMemo(() => {
    if (!baseValid || baseCidr === null || !subnetsValidation.valid || !subnetsRequired) return null;
    try {
      return calculateFLSM(baseNetwork.trim(), baseCidr, Number(subnetsRequired));
    } catch {
      return null;
    }
  }, [baseValid, baseCidr, baseNetwork, subnetsValidation.valid, subnetsRequired]);

  const columns: SubnetTableColumn<FLSMSubnet>[] = [
    { key: 'index', label: t('flsm.index'), accessor: (s) => s.index, numeric: true },
    { key: 'network', label: t('ipv4.networkAddress'), accessor: (s) => `${s.networkAddress}/${s.cidr}` },
    { key: 'broadcast', label: t('ipv4.broadcastAddress'), accessor: (s) => s.broadcastAddress },
    {
      key: 'range',
      label: `${t('ipv4.firstUsableHost')} - ${t('ipv4.lastUsableHost')}`,
      accessor: (s) => `${s.firstUsableHost} - ${s.lastUsableHost}`,
    },
    { key: 'usable', label: t('ipv4.usableHosts'), accessor: (s) => s.usableHosts, numeric: true },
  ];

  const handleExportCsv = () => {
    if (!result) return;
    downloadCsv(
      'flsm-subnets',
      result.subnets.map((s) => ({
        [t('flsm.index')]: s.index,
        [t('ipv4.networkAddress')]: `${s.networkAddress}/${s.cidr}`,
        [t('ipv4.broadcastAddress')]: s.broadcastAddress,
        [t('ipv4.firstUsableHost')]: s.firstUsableHost ?? '',
        [t('ipv4.lastUsableHost')]: s.lastUsableHost ?? '',
        [t('ipv4.usableHosts')]: s.usableHosts,
      }))
    );
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportToPdf({
      title: t('flsm.heading'),
      subtitle: `${result.baseNetwork}/${result.baseCidr} \u2192 /${result.newCidr}`,
      columns: [
        t('flsm.index'),
        t('ipv4.networkAddress'),
        t('ipv4.broadcastAddress'),
        t('ipv4.firstUsableHost'),
        t('ipv4.lastUsableHost'),
        t('ipv4.usableHosts'),
      ],
      rows: result.subnets.map((s) => [
        s.index,
        `${s.networkAddress}/${s.cidr}`,
        s.broadcastAddress,
        s.firstUsableHost ?? '-',
        s.lastUsableHost ?? '-',
        s.usableHosts,
      ]),
      filename: 'flsm-subnets',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h2 className="mb-1 text-base font-semibold">{t('flsm.heading')}</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
          {t('flsm.description')}
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('reverse.baseNetwork')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={baseNetwork}
              onChange={(e) => setBaseNetwork(e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('reverse.baseCidr')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={baseCidrInput}
              onChange={(e) => setBaseCidrInput(e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('flsm.subnetsRequired')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={subnetsRequired}
              onChange={(e) => setSubnetsRequired(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>

        {baseCidr === null && baseCidrInput !== '' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>
            {t('errors.invalidMask', { value: baseCidrInput })}
          </p>
        )}
      </div>

      {result && !result.fits && (
        <div className="card p-4" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
          <ul className="list-inside list-disc text-sm" style={{ color: 'var(--danger)' }}>
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result && result.fits && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
                {t('flsm.resultTable')}
              </h3>
              <p className="force-ltr text-xs" style={{ color: 'var(--fg-muted)' }}>
                /{result.baseCidr} \u2192 /{result.newCidr} ({result.subnetsCreated} subnets, {result.borrowedBits} bits borrowed)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="rounded-md border px-2.5 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                {t('common.exportCsv')}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="rounded-md border px-2.5 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                {t('common.exportPdf')}
              </button>
            </div>
          </div>
          <SubnetTable columns={columns} rows={result.subnets} filterPlaceholder={t('ipv4.networkAddress')} />
        </div>
      )}
    </div>
  );
}
