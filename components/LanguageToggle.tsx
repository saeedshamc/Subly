'use client';

import { useTranslation, type Locale } from '../lib/i18n/I18nProvider';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  const options: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fa', label: '\u0641\u0627\u0631\u0633\u06CC' },
  ];

  return (
    <div
      className="flex items-center overflow-hidden rounded-lg border text-sm"
      style={{ borderColor: 'var(--border)' }}
      role="group"
      aria-label={t('common.language')}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLocale(opt.value)}
          className="px-3 py-1.5 transition-colors"
          style={{
            backgroundColor: locale === opt.value ? 'var(--accent)' : 'transparent',
            color: locale === opt.value ? 'var(--accent-fg)' : 'var(--fg)',
          }}
          aria-pressed={locale === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
