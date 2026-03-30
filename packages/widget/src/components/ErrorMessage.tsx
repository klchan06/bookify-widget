import React from 'react';
import { t, type Locale } from '../i18n';

interface ErrorMessageProps {
  message: string;
  locale?: Locale;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  locale = 'nl',
  onRetry,
}) => (
  <div className="bk-error" role="alert">
    <p className="bk-error__message">{message}</p>
    {onRetry && (
      <button className="bk-btn bk-btn--secondary" onClick={onRetry}>
        {t('widget.retry', locale)}
      </button>
    )}
  </div>
);
