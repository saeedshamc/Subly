'use client';

import { useState } from 'react';
import { useTranslation } from '../lib/i18n/I18nProvider';

interface CopyButtonProps {
  value: string;
  label?: string;
  small?: boolean;
}

export default function CopyButton({ value, label, small }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable (e.g. insecure context) - fail silently.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded-md border transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
        small ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
      style={{ borderColor: 'var(--border)' }}
      aria-label={label ?? t('common.copy')}
      title={label ?? t('common.copy')}
    >
      <span aria-hidden="true">{copied ? '\u2713' : '\u29C9'}</span>
      {!small && <span>{copied ? t('common.copied') : label ?? t('common.copy')}</span>}
    </button>
  );
}
