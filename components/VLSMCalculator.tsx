'use client';

import { useMemo, useState } from 'react';
import { calculateVLSM } from '../lib/subnet-engine/vlsm';
import { normalizeMaskInput, isValidIPv4 } from '../lib/subnet-engine/validation';
import { useTranslation } from '../lib/i18n/I18nProvider';
import SubnetTable, { type SubnetTableColumn } from './SubnetTable';
import AllocationBar from './AllocationBar';
import { downloadCsv } from '../lib/utils/csv';
import { exportToPdf } from '../lib/utils/pdf';
import type { VLSMAllocation } from '../lib/subnet-engine/types';

interface Row {
  id: number;
  name: string;
  hosts: string;
}

let nextId = 4;

export default function VLSMCalculator() {
  const { t } = useTranslation();
  const [baseNetwork, setBaseNetwork] = useState('192.168.1.0');
  const [baseCidrInput, setBaseCidrInput] = useState('24');
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: 'Sales', hosts: '60' },
    { id: 2, name: 'Engineering', hosts: '25' },
    { id: 3, name: 'Guest Wi-Fi', hosts: '10' },
  ]);

  const baseCidr = normalizeMaskInput(baseCidrInput);
  const baseValid = isValidIPv4(baseNetwork.trim()) && baseCidr !== null;

  const result = useMemo(() => {
    if (!baseValid || baseCidr === null) return null;
    const requests = rows
      .filter((r) => r.name.trim() !== '' && r.hosts.trim() !== '')
      .map((r) => ({ name: r.name.trim(), hostsNeeded: Number(r.hosts) }));
    if (requests.length === 0) return null;
    try {
      return calculateVLSM(baseNetwork.trim(), baseCidr, requests);
    } catch {
      return null;
    }
  }, [baseValid, baseCidr, baseNetwork, rows]);

  const addRow = () => setRows((r) => [...r, { id: nextId++, name: `Subnet ${r.length + 1}`, hosts: '10' }]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));
  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const columns: SubnetTableColumn<VLSMAllocation>[] = [
    { key: 'name', label: t('vlsm.subnetName'), accessor: (a) => a.name },
    { key: 'network', label: t('ipv4.networkAddress'), accessor: (a) => `${a.networkAddress}/${a.cidr}` },
    { key: 'broadcast', label: t('ipv4.broadcastAddress'), accessor: (a) => a.broadcastAddress },
    {
      key: 'range',
      label: `${t('ipv4.firstUsableHost')} - ${t('ipv4.lastUsableHost')}`,
      accessor: (a) => `${a.firstUsableHost} - ${a.lastUsableHost}`,
    },
    { key: 'usable', label: t('ipv4.usableHosts'), accessor: (a) => a.usableHosts, numeric: true },
    { key: 'mask', label: t('ipv4.subnetMask'), accessor: (a) => a.subnetMask },
  ];

  const handleExportCsv = () => {
    if (!result) return;
    downloadCsv(
      'vlsm-allocation',
      result.allocations.map((a) => ({
        [t('vlsm.subnetName')]: a.name,
        [t('ipv4.networkAddress')]: `${a.networkAddress}/${a.cidr}`,
        [t('ipv4.broadcastAddress')]: a.broadcastAddress,
        [t('ipv4.firstUsableHost')]: a.firstUsableHost ?? '',
        [t('ipv4.lastUsableHost')]: a.lastUsableHost ?? '',
        [t('ipv4.usableHosts')]: a.usableHosts,
        [t('ipv4.subnetMask')]: a.subnetMask,
      }))
    );
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportToPdf({
      title: t('vlsm.heading'),
      subtitle: `${result.baseNetwork}/${result.baseCidr}`,
      columns: [
        t('vlsm.subnetName'),
        t('ipv4.networkAddress'),
        t('ipv4.broadcastAddress'),
        t('ipv4.firstUsableHost'),
        t('ipv4.lastUsableHost'),
        t('ipv4.usableHosts'),
      ],
      rows: result.allocations.map((a) => [
        a.name,
        `${a.networkAddress}/${a.cidr}`,
        a.broadcastAddress,
        a.firstUsableHost ?? '-',
        a.lastUsableHost ?? '-',
        a.usableHosts,
      ]),
      filename: 'vlsm-allocation',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h2 className="mb-1 text-base font-semibold">{t('vlsm.heading')}</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
          {t('vlsm.description')}
        </p>

        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
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
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-md px-3 py-2 text-sm"
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                placeholder={t('vlsm.subnetName')}
              />
              <input
                className="force-ltr w-32 rounded-md px-3 py-2 text-sm"
                value={row.hosts}
                onChange={(e) => updateRow(row.id, { hosts: e.target.value })}
                placeholder={t('vlsm.hostsNeeded')}
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded-md border px-2 py-2 text-xs"
                style={{ borderColor: 'var(--border)' }}
                aria-label={t('common.remove')}
              >
                &#10005;
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="self-start rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            + {t('vlsm.addSubnet')}
          </button>
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          {!result.fits && (
            <div className="card p-4" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
              <p className="font-medium" style={{ color: 'var(--danger)' }}>
                {t('vlsm.doesNotFit')}
              </p>
              <ul className="mt-2 list-inside list-disc text-sm" style={{ color: 'var(--danger)' }}>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
              {t('vlsm.allocationTable')}
            </h3>
            <AllocationBar vlsm={result} />
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span>
                {t('vlsm.totalBase')}: <strong className="force-ltr">{result.totalBaseAddresses}</strong>
              </span>
              <span>
                {t('vlsm.totalAllocated')}: <strong className="force-ltr">{result.totalAllocatedAddresses}</strong>
              </span>
              <span>
                {t('vlsm.totalUnallocated')}: <strong className="force-ltr">{result.totalUnallocatedAddresses}</strong>
              </span>
            </div>
          </div>

          {result.allocations.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
                  {t('common.results')}
                </h3>
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
              <SubnetTable columns={columns} rows={result.allocations} filterPlaceholder={t('common.name')} />
            </div>
          )}

          {result.unallocated.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
                {t('vlsm.unallocatedSpace')}
              </h3>
              <ul className="force-ltr flex flex-col gap-1 font-mono text-sm">
                {result.unallocated.map((u, i) => (
                  <li key={i}>
                    {u.networkAddress}/{u.cidr} ({u.totalAddresses} addresses)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
            {t('showWork.vlsmOrderingStep')}
          </div>
        </div>
      )}
    </div>
  );
}
