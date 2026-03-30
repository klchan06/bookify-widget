import React from 'react';
import { t, type Locale } from '../i18n';

interface LoadingSpinnerProps {
  locale?: Locale;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ locale = 'nl', text }) => (
  <div className="bk-loading" role="status" aria-label={t('widget.loading', locale)}>
    <div className="bk-spinner" />
    <span className="bk-loading__text">{text || t('widget.loading', locale)}</span>
  </div>
);
