'use client';

import { useMemo, useState } from 'react';
import { hostsToCidr } from '../lib/subnet-engine/ipv4';
import { validateHostsRequested } from '../lib/subnet-engine/validation';
import { useTranslation } from '../lib/i18n/I18nProvider';
import ResultField from './ResultField';

export default function HostsToCidrCalculator() {
  const { t } = useTranslation();
  const [hosts, setHosts] = useState('50');

  const validation = useMemo(() => validateHostsRequested(hosts), [hosts]);
  const result = useMemo(() => {
    if (!validation.valid || !hosts) return null;
    try {
      return hostsToCidr(Number(hosts));
    } catch {
      return null;
    }
  }, [validation.valid, hosts]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h2 className="mb-4 text-base font-semibold">{t('reverse.hostsHeading')}</h2>
        <label className="flex max-w-xs flex-col gap-1 text-sm">
          {t('reverse.hostsNeeded')}
          <input
            className="force-ltr rounded-md px-3 py-2 text-sm"
            value={hosts}
            onChange={(e) => setHosts(e.target.value)}
            placeholder={t('reverse.hostsPlaceholder')}
            inputMode="numeric"
          />
        </label>
        {!validation.valid && hosts !== '' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>
            {t(validation.errors[0].messageKey)}
          </p>
        )}
      </div>

      {result && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
            {t('common.results')}
          </h3>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <ResultField label={t('reverse.recommendedCidr')} value={`/${result.cidr}`} />
            <ResultField label={t('ipv4.subnetMask')} value={result.subnetMask} />
            <ResultField label={t('ipv4.totalHosts')} value={result.totalHosts} mono={false} />
            <ResultField label={t('ipv4.usableHosts')} value={result.usableHosts} mono={false} />
          </div>
        </div>
      )}
    </div>
  );
}
