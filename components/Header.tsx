'use client';

import { useTranslation } from '../lib/i18n/I18nProvider';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

export type TabKey = 'ipv4' | 'hostsToCidr' | 'subnetsToCidr' | 'vlsm' | 'flsm' | 'ipv6';

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const TABS: TabKey[] = ['ipv4', 'hostsToCidr', 'subnetsToCidr', 'vlsm', 'flsm', 'ipv6'];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{t('app.title')}</h1>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {t('app.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab ? 'var(--accent)' : 'transparent',
                color: activeTab === tab ? 'var(--accent-fg)' : 'var(--fg)',
              }}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {t(`nav.${tab}`)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
