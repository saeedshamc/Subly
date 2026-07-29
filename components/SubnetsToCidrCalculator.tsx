'use client';

import { useMemo, useState } from 'react';
import { subnetsToCidr } from '../lib/subnet-engine/ipv4';
import { validateSubnetsRequested, normalizeMaskInput } from '../lib/subnet-engine/validation';
import { useTranslation } from '../lib/i18n/I18nProvider';
import ResultField from './ResultField';

export default function SubnetsToCidrCalculator() {
  const { t } = useTranslation();
  const [baseCidrInput, setBaseCidrInput] = useState('24');
  const [subnets, setSubnets] = useState('5');

  const baseCidr = normalizeMaskInput(baseCidrInput);
  const subnetsValidation = useMemo(() => validateSubnetsRequested(subnets), [subnets]);

  const result = useMemo(() => {
    if (baseCidr === null || !subnetsValidation.valid || !subnets) return null;
    try {
      return subnetsToCidr(baseCidr, Number(subnets));
    } catch {
      return null;
    }
  }, [baseCidr, subnetsValidation.valid, subnets]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h2 className="mb-4 text-base font-semibold">{t('reverse.subnetsHeading')}</h2>
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('reverse.baseCidr')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={baseCidrInput}
              onChange={(e) => setBaseCidrInput(e.target.value)}
              placeholder="24"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {t('reverse.subnetsNeeded')}
            <input
              className="force-ltr rounded-md px-3 py-2 text-sm"
              value={subnets}
              onChange={(e) => setSubnets(e.target.value)}
              placeholder={t('reverse.subnetsPlaceholder')}
              inputMode="numeric"
            />
          </label>
        </div>
        {baseCidr === null && baseCidrInput !== '' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>
            {t('errors.invalidMask', { value: baseCidrInput })}
          </p>
        )}
        {!subnetsValidation.valid && subnets !== '' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>
            {t(subnetsValidation.errors[0].messageKey)}
          </p>
        )}
      </div>

      {result && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
            {t('common.results')}
          </h3>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <ResultField label={t('reverse.recommendedCidr')} value={`/${result.newCidr}`} />
            <ResultField label={t('ipv4.subnetMask')} value={result.subnetMask} />
            <ResultField label={t('reverse.borrowedBits')} value={result.borrowedBits} mono={false} />
            <ResultField label={t('reverse.subnetsCreated')} value={result.subnetsCreated} mono={false} />
            <ResultField label={t('reverse.hostsPerSubnet')} value={result.usableHostsPerSubnet} mono={false} />
          </div>
        </div>
      )}
    </div>
  );
}
