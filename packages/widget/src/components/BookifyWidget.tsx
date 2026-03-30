import React, { useMemo, useCallback, useState } from 'react';
import type { WidgetConfig, Booking } from '@bookify/shared';
import { DEFAULT_BOOKING_WINDOW } from '@bookify/shared';
import type { Locale } from '../i18n';
import { t } from '../i18n';
import { BookifyApiClient } from '../api/client';
import { useBooking } from '../hooks/useBooking';
import { useSalonConfig } from '../hooks/useSalonConfig';
import { Header } from './Header';
import { StepIndicator } from './StepIndicator';
import { ServiceSelect } from './ServiceSelect';
import { EmployeeSelect } from './EmployeeSelect';
import { DateTimeSelect } from './DateTimeSelect';
import { CustomerForm } from './CustomerForm';
import { Confirmation } from './Confirmation';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface BookifyWidgetProps {
  config: WidgetConfig;
}

const STEP_TITLES: Record<number, string> = {
  1: 'step.service',
  2: 'step.employee',
  3: 'step.datetime',
  4: 'step.details',
  5: 'step.confirm',
};

export const BookifyWidget: React.FC<BookifyWidgetProps> = ({ config }) => {
  const locale = (config.locale || 'nl') as Locale;
  const showPrices = config.showPrices !== false;
  const showDuration = config.showDuration !== false;

  const apiClient = useMemo(
    () => new BookifyApiClient(config.apiUrl),
    [config.apiUrl]
  );

  const { salon, settings, loading: salonLoading, error: salonError } = useSalonConfig(
    apiClient,
    config.salonId
  );

  const booking = useBooking();
  const [, setCompletedBooking] = useState<Booking | null>(null);

  const bookingWindow = settings?.bookingWindow || DEFAULT_BOOKING_WINDOW;

  const handleSuccess = useCallback((b: Booking) => {
    setCompletedBooking(b);
  }, []);

  // Apply custom theme via CSS variables
  const themeStyle = useMemo(() => {
    const vars: Record<string, string> = {};
    const primary = config.primaryColor || settings?.widgetPrimaryColor;
    const accent = config.accentColor || settings?.widgetAccentColor;
    const radius = config.borderRadius ?? settings?.widgetBorderRadius;
    const font = config.fontFamily || settings?.widgetFontFamily;

    if (primary) {
      vars['--bk-primary'] = primary;
    }
    if (accent) {
      vars['--bk-primary-hover'] = accent;
      vars['--bk-accent'] = accent;
    }
    if (radius !== undefined) {
      vars['--bk-radius'] = `${radius}px`;
      vars['--bk-radius-lg'] = `${radius + 4}px`;
    }
    if (font) {
      vars['--bk-font-family'] = font;
    }
    return vars as React.CSSProperties;
  }, [config, settings]);

  if (salonLoading) {
    return (
      <div className="bookify-widget" style={themeStyle}>
        <LoadingSpinner locale={locale} />
      </div>
    );
  }

  if (salonError || !salon) {
    return (
      <div className="bookify-widget" style={themeStyle}>
        <ErrorMessage
          message={salonError || t('widget.error', locale)}
          locale={locale}
        />
      </div>
    );
  }

  const stepTitleKey = STEP_TITLES[booking.step] || 'widget.title';

  const renderStep = () => {
    switch (booking.step) {
      case 1:
        return (
          <ServiceSelect
            apiClient={apiClient}
            salonId={config.salonId}
            locale={locale}
            showPrices={showPrices}
            showDuration={showDuration}
            onSelect={booking.selectService}
          />
        );
      case 2:
        return (
          <EmployeeSelect
            apiClient={apiClient}
            salonId={config.salonId}
            serviceId={booking.selectedService!.id}
            locale={locale}
            onSelect={booking.selectEmployee}
            onSkip={booking.skipEmployeeStep}
          />
        );
      case 3:
        return (
          <DateTimeSelect
            apiClient={apiClient}
            salonId={config.salonId}
            serviceId={booking.selectedService!.id}
            employeeId={booking.selectedEmployee?.id}
            noPreference={booking.noEmployeePreference}
            locale={locale}
            bookingWindow={bookingWindow}
            onSelect={booking.selectDateTime}
          />
        );
      case 4:
        return (
          <CustomerForm
            locale={locale}
            requirePhone={settings?.requirePhone ?? false}
            onSubmit={booking.setCustomerData}
            initialData={booking.customerData}
          />
        );
      case 5:
        return (
          <Confirmation
            apiClient={apiClient}
            salonId={config.salonId}
            salonName={salon.name}
            salonAddress={`${salon.address}, ${salon.city}`}
            service={booking.selectedService!}
            employee={booking.selectedEmployee}
            date={booking.selectedDate!}
            time={booking.selectedTime!}
            employeeId={booking.selectedEmployeeId}
            customerData={booking.customerData}
            locale={locale}
            onSuccess={handleSuccess}
            onNewBooking={booking.reset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bookify-widget" style={themeStyle}>
      <Header
        title={t(stepTitleKey as any, locale)}
        salonName={salon.name}
        showBack={booking.step > 1 && booking.step < 5}
        onBack={booking.goBack}
        locale={locale}
      />
      <StepIndicator currentStep={booking.step} totalSteps={5} />
      <div className="bk-content">
        <div className="bk-step-active">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};
