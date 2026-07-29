'use client';

import { useMemo, useState } from 'react';
import { calculateIPv6Subnet, subnetIPv6 } from '../lib/subnet-engine/ipv6';
import { validateIPv6Input, isValidIPv6PrefixLength } from '../lib/subnet-engine/validation';
import { useTranslation } from '../lib/i18n/I18nProvider';
import ResultField from './ResultField';
import SubnetTable, { type SubnetTableColumn } from './SubnetTable';
import { downloadCsv } from '../lib/utils/csv';
import type { IPv6Result } from '../lib/subnet-engine/types';

export default function IPv6Calculator() {
  const { t } = useTranslation();
  const [address, setAddress] = useState('2001:db8::1');
  const [prefixLength, setPrefixLength] = useState('64');
  const [newPrefixLength, setNewPrefixLength] = useState('66');

  const validation = useMemo(() => validateIPv6Input(address, prefixLength), [address, prefixLength]);

  const result = useMemo(() => {
    if (!validation.valid) return null;
    try {
      return calculateIPv6Subnet(address.trim(), Number(prefixLength));
    } catch {
      return null;
    }
  }, [validation.valid, address, prefixLength]);

  const splitValid =
    result !== null &&
    isValidIPv6PrefixLength(newPrefixLength) &&
    Number(newPrefixLength) >= Number(prefixLength) &&
    Number(newPrefixLength) - Number(prefixLength) <= 24; // sane UI cap; engine itself also caps enumeration

  const splitResult = useMemo(() => {
    if (!splitValid || !result) return null;
    return subnetIPv6({
      address: address.trim(),
      prefixLength: Number(prefixLength),
      newPrefixLength: Number(newPrefixLength),
      limit: 500,
    });
  }, [splitValid, result, address, prefixLength, newPrefixLength]);

  const columns: SubnetTableColumn<IPv6Result>[] = [
    { key: 'prefix', label: t('ipv6.networkPrefix'), accessor: (s) => `${s.networkPrefix}/${s.prefixLength}` },
    { key: 'first', label: t('ipv6.firstAddress'), accessor: (s) => s.firstAddressCompressed },
    { key: 'last', label: t('ipv6.lastAddress'), accessor: (s) => s.lastAddressCompressed },
  ];

  const handleExportCsv = () => {
    if (!splitResult) return;
    downloadCsv(
      'ipv6-subnets',
      splitResult.subnets.map((s) => ({
        [t('ipv6.networkPrefix')]: `${s.networkPrefix}/${s.prefixLength}`,
        [t('ipv6.firstAddress')]: s.firstAddressCompressed,
        [t('ipv6.lastAddress')]: s.lastAddressCompressed,
      }))
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h2 className="mb-4 text-base font-semibold">{t('ipv6.heading')}</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-[2] flex-col gap-1 text-sm">
            {t('ipv6.address')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('ipv6.addressPlaceholder')}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('ipv6.prefixLength')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={prefixLength}
              onChange={(e) => setPrefixLength(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
        {!validation.valid && (
          <ul className="mt-3 flex flex-col gap-1 text-sm" style={{ color: 'var(--danger)' }}>
            {validation.errors.map((err) => (
              <li key={err.field}>{t(err.messageKey, err.params)}</li>
            ))}
          </ul>
        )}
      </div>

      {result && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
            {t('common.results')}
          </h3>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <ResultField label={t('ipv6.compressed')} value={result.compressed} />
            <ResultField label={t('ipv6.expanded')} value={result.expanded} />
            <ResultField label={t('ipv6.networkPrefix')} value={`${result.networkPrefix}/${result.prefixLength}`} />
            <ResultField label={t('ipv6.firstAddress')} value={result.firstAddressCompressed} />
            <ResultField label={t('ipv6.lastAddress')} value={result.lastAddressCompressed} />
            <ResultField label={t('ipv6.totalAddresses')} value={result.totalAddresses} />
            <ResultField
              label={t('ipv6.addressType')}
              value={t(`ipv6AddressTypes.${result.addressTypeInfo.type}`)}
              mono={false}
            />
          </div>
        </div>
      )}

      {result && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
            {t('ipv6.splitHeading')}
          </h3>
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            {t('ipv6.newPrefixLength')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={newPrefixLength}
              onChange={(e) => setNewPrefixLength(e.target.value)}
              inputMode="numeric"
            />
          </label>

          {splitResult && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="force-ltr text-sm" style={{ color: 'var(--fg-muted)' }}>
                  {t('ipv6.totalSubnets')}: {splitResult.totalSubnets}
                </span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-md border px-2.5 py-1 text-xs"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {t('common.exportCsv')}
                </button>
              </div>
              {splitResult.truncated && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>
                  {t('ipv6.truncatedWarning')}
                </p>
              )}
              <SubnetTable columns={columns} rows={splitResult.subnets} filterPlaceholder={t('ipv6.networkPrefix')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
