'use client';

import { useTheme } from '../lib/hooks/ThemeProvider';
import { useTranslation } from '../lib/i18n/I18nProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
      style={{ borderColor: 'var(--border)' }}
      aria-label={t('common.theme')}
      title={t('common.theme')}
    >
      <span aria-hidden="true">{theme === 'dark' ? '\u{1F319}' : '\u2600\uFE0F'}</span>
      <span>{theme === 'dark' ? t('common.dark') : t('common.light')}</span>
    </button>
  );
}
