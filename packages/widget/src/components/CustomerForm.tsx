import React, { useState, useCallback } from 'react';
import { isValidEmail, isValidPhone } from '@bookify/shared';
import { t, type Locale } from '../i18n';
import type { CustomerData } from '../hooks/useBooking';

interface CustomerFormProps {
  locale: Locale;
  requirePhone: boolean;
  onSubmit: (data: CustomerData) => void;
  initialData?: CustomerData;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  locale,
  requirePhone,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<CustomerData>(
    initialData || { name: '', email: '', phone: '', notes: '' }
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.required', locale);
    }

    if (!formData.email.trim()) {
      newErrors.email = t('form.required', locale);
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = t('form.invalidEmail', locale);
    }

    if (requirePhone && !formData.phone.trim()) {
      newErrors.phone = t('form.required', locale);
    } else if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      newErrors.phone = t('form.invalidPhone', locale);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, requirePhone, locale]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (validate()) {
        onSubmit(formData);
      }
    },
    [formData, validate, onSubmit]
  );

  const handleChange = useCallback(
    (field: keyof CustomerData) => (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error on change
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  return (
    <div>
      <h2 className="bk-content__title">{t('form.title', locale)}</h2>
      <form className="bk-form" onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="bk-field">
          <label className="bk-field__label bk-field__label--required" htmlFor="bk-name">
            {t('form.name', locale)}
          </label>
          <input
            id="bk-name"
            type="text"
            className={`bk-field__input${errors.name ? ' bk-field__input--error' : ''}`}
            placeholder={t('form.namePlaceholder', locale)}
            value={formData.name}
            onChange={handleChange('name')}
            autoComplete="name"
            aria-required="true"
            aria-invalid={!!errors.name}
          />
          {errors.name && <span className="bk-field__error">{errors.name}</span>}
        </div>

        {/* Email */}
        <div className="bk-field">
          <label className="bk-field__label bk-field__label--required" htmlFor="bk-email">
            {t('form.email', locale)}
          </label>
          <input
            id="bk-email"
            type="email"
            className={`bk-field__input${errors.email ? ' bk-field__input--error' : ''}`}
            placeholder={t('form.emailPlaceholder', locale)}
            value={formData.email}
            onChange={handleChange('email')}
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
          />
          {errors.email && <span className="bk-field__error">{errors.email}</span>}
        </div>

        {/* Phone */}
        <div className="bk-field">
          <label
            className={`bk-field__label${requirePhone ? ' bk-field__label--required' : ''}`}
            htmlFor="bk-phone"
          >
            {t('form.phone', locale)}
          </label>
          <input
            id="bk-phone"
            type="tel"
            className={`bk-field__input${errors.phone ? ' bk-field__input--error' : ''}`}
            placeholder={t('form.phonePlaceholder', locale)}
            value={formData.phone}
            onChange={handleChange('phone')}
            autoComplete="tel"
            aria-required={requirePhone}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <span className="bk-field__error">{errors.phone}</span>}
        </div>

        {/* Notes */}
        <div className="bk-field">
          <label className="bk-field__label" htmlFor="bk-notes">
            {t('form.notes', locale)}
          </label>
          <textarea
            id="bk-notes"
            className="bk-field__input"
            placeholder={t('form.notesPlaceholder', locale)}
            value={formData.notes}
            onChange={handleChange('notes')}
            rows={3}
          />
        </div>

        <button type="submit" className="bk-btn bk-btn--primary">
          {t('widget.next', locale)}
        </button>
      </form>
    </div>
  );
};
