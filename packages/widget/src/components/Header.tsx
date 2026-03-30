import React from 'react';
import { t, type Locale } from '../i18n';

interface HeaderProps {
  title: string;
  salonName?: string;
  showBack: boolean;
  onBack: () => void;
  locale?: Locale;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  salonName,
  showBack,
  onBack,
  locale = 'nl',
}) => (
  <div className="bk-header">
    {showBack && (
      <button
        className="bk-header__back"
        onClick={onBack}
        aria-label={t('widget.back', locale)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    )}
    <div>
      <div className="bk-header__title">{title}</div>
      {salonName && <div className="bk-header__salon">{salonName}</div>}
    </div>
  </div>
);
