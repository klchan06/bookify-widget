import React, { useState, useEffect } from 'react';
import { Building2, Calendar, Palette, Bell, Link2, Copy, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { ColorPicker } from '../components/ColorPicker';
import { LoadingSpinner } from '../components/LoadingScreen';
import { useSalon, useSalonSettings, useUpdateSalon, useUpdateSalonSettings } from '../hooks/useSalon';
import { salonApi } from '../api/salon';
import { calendarApi } from '../api/calendar';
import type { Salon, SalonSettings } from '@bookify/shared';
import toast from 'react-hot-toast';

type Tab = 'business' | 'booking' | 'widget' | 'notifications' | 'integrations';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'business', label: 'Bedrijfsgegevens', icon: <Building2 className="w-4 h-4" /> },
  { id: 'booking', label: 'Boekingsinstellingen', icon: <Calendar className="w-4 h-4" /> },
  { id: 'widget', label: 'Widget', icon: <Palette className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notificaties', icon: <Bell className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integraties', icon: <Link2 className="w-4 h-4" /> },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('business');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-500 mt-1">Beheer je salon en configuratie</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[48px] ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="card">
        {activeTab === 'business' && <BusinessTab />}
        {activeTab === 'booking' && <BookingTab />}
        {activeTab === 'widget' && <WidgetTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>
    </div>
  );
}

function BusinessTab() {
  const { data: salon, isLoading } = useSalon();
  const updateSalon = useUpdateSalon();
  const [form, setForm] = useState<Partial<Salon>>({});

  useEffect(() => {
    if (salon) setForm(salon);
  }, [salon]);

  if (isLoading) return <LoadingSpinner />;

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSalon.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      postalCode: form.postalCode,
      description: form.description,
      website: form.website,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await salonApi.uploadLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      toast.success('Logo geupload');
    } catch {
      toast.error('Fout bij uploaden logo');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Bedrijfsgegevens</h2>

      {/* Logo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Logo</label>
        <div className="flex items-center gap-4">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <label className="cursor-pointer">
            <span className="btn-secondary inline-block text-sm">Logo uploaden</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>
      </div>

      <Input label="Salonnaam" value={form.name || ''} onChange={(e) => update('name', e.target.value)} />
      <Input label="E-mailadres" type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
      <Input label="Telefoonnummer" type="tel" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} />
      <Input label="Adres" value={form.address || ''} onChange={(e) => update('address', e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Postcode" value={form.postalCode || ''} onChange={(e) => update('postalCode', e.target.value)} />
        <Input label="Stad" value={form.city || ''} onChange={(e) => update('city', e.target.value)} />
      </div>
      <Input label="Website" value={form.website || ''} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Beschrijving</label>
        <textarea
          value={form.description || ''}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="input-field"
          placeholder="Vertel iets over je salon..."
        />
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button onClick={handleSave} loading={updateSalon.isPending}>
          Opslaan
        </Button>
      </div>
    </div>
  );
}

function BookingTab() {
  const { data: settings, isLoading } = useSalonSettings();
  const updateSettings = useUpdateSalonSettings();
  const [form, setForm] = useState<Partial<SalonSettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading) return <LoadingSpinner />;

  const update = (field: string, value: number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate({
      bookingLeadTime: form.bookingLeadTime,
      bookingWindow: form.bookingWindow,
      cancellationWindow: form.cancellationWindow,
      slotDuration: form.slotDuration,
      allowEmployeeChoice: form.allowEmployeeChoice,
      requirePhone: form.requirePhone,
    });
  };

  const slotOptions = [
    { value: '10', label: '10 minuten' },
    { value: '15', label: '15 minuten' },
    { value: '20', label: '20 minuten' },
    { value: '30', label: '30 minuten' },
    { value: '60', label: '60 minuten' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Boekingsinstellingen</h2>

      <Input
        label="Minimale voorbereidingstijd (uren)"
        type="number"
        value={String(form.bookingLeadTime ?? 2)}
        onChange={(e) => update('bookingLeadTime', Number(e.target.value))}
        helpText="Hoeveel uur van tevoren kan een klant minimaal boeken?"
        min="0"
      />
      <Input
        label="Boekingsvenster (dagen)"
        type="number"
        value={String(form.bookingWindow ?? 30)}
        onChange={(e) => update('bookingWindow', Number(e.target.value))}
        helpText="Hoeveel dagen vooruit kan een klant boeken?"
        min="1"
      />
      <Input
        label="Annuleringsvenster (uren)"
        type="number"
        value={String(form.cancellationWindow ?? 24)}
        onChange={(e) => update('cancellationWindow', Number(e.target.value))}
        helpText="Hoeveel uur van tevoren kan een klant annuleren?"
        min="0"
      />
      <Select
        label="Slot duur"
        options={slotOptions}
        value={String(form.slotDuration ?? 15)}
        onChange={(e) => update('slotDuration', Number(e.target.value))}
      />

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.allowEmployeeChoice ?? true}
            onChange={(e) => update('allowEmployeeChoice', e.target.checked)}
            className="w-4 h-4 text-brand-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Klant mag medewerker kiezen</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.requirePhone ?? false}
            onChange={(e) => update('requirePhone', e.target.checked)}
            className="w-4 h-4 text-brand-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Telefoonnummer verplicht bij boeking</span>
        </label>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button onClick={handleSave} loading={updateSettings.isPending}>
          Opslaan
        </Button>
      </div>
    </div>
  );
}

function WidgetTab() {
  const { data: settings, isLoading } = useSalonSettings();
  const { data: salon } = useSalon();
  const updateSettings = useUpdateSalonSettings();
  const [form, setForm] = useState<Partial<SalonSettings>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading) return <LoadingSpinner />;

  const handleSave = () => {
    updateSettings.mutate({
      widgetPrimaryColor: form.widgetPrimaryColor,
      widgetAccentColor: form.widgetAccentColor,
      widgetBorderRadius: form.widgetBorderRadius,
      widgetFontFamily: form.widgetFontFamily,
    });
  };

  const embedCode = `<script src="${window.location.origin}/widget.js" data-salon-id="${salon?.id || 'YOUR_SALON_ID'}"></script>`;
  const iframeCode = `<iframe src="${window.location.origin}/widget/${salon?.slug || 'your-salon'}" width="400" height="600" frameborder="0"></iframe>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Gekopieerd naar klembord');
    setTimeout(() => setCopied(false), 2000);
  };

  const fontOptions = [
    { value: "'Inter', sans-serif", label: 'Inter' },
    { value: "'Roboto', sans-serif", label: 'Roboto' },
    { value: "'Open Sans', sans-serif", label: 'Open Sans' },
    { value: "'Poppins', sans-serif", label: 'Poppins' },
    { value: "system-ui, sans-serif", label: 'Systeem' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Widget aanpassen</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="space-y-4">
          <ColorPicker
            label="Primaire kleur"
            value={form.widgetPrimaryColor || '#2563eb'}
            onChange={(c) => setForm((prev) => ({ ...prev, widgetPrimaryColor: c }))}
          />
          <ColorPicker
            label="Accent kleur"
            value={form.widgetAccentColor || '#1d4ed8'}
            onChange={(c) => setForm((prev) => ({ ...prev, widgetAccentColor: c }))}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Hoekafronding: {form.widgetBorderRadius ?? 8}px
            </label>
            <input
              type="range"
              min="0"
              max="24"
              value={form.widgetBorderRadius ?? 8}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, widgetBorderRadius: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>
          <Select
            label="Lettertype"
            options={fontOptions}
            value={form.widgetFontFamily || "'Inter', sans-serif"}
            onChange={(e) => setForm((prev) => ({ ...prev, widgetFontFamily: e.target.value }))}
          />

          <div className="pt-4 border-t border-gray-100">
            <Button onClick={handleSave} loading={updateSettings.isPending}>
              Opslaan
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Voorbeeld</h3>
          <div
            className="border border-gray-200 p-4 bg-white"
            style={{
              fontFamily: form.widgetFontFamily || "'Inter', sans-serif",
              borderRadius: `${form.widgetBorderRadius ?? 8}px`,
            }}
          >
            <div
              className="text-white p-4 mb-4 text-center font-semibold"
              style={{
                backgroundColor: form.widgetPrimaryColor || '#2563eb',
                borderRadius: `${form.widgetBorderRadius ?? 8}px`,
              }}
            >
              {salon?.name || 'Jouw Salon'}
            </div>
            <div className="space-y-2">
              {['Knippen', 'Kleuren', 'Styling'].map((s) => (
                <div
                  key={s}
                  className="p-3 border border-gray-200 flex justify-between items-center"
                  style={{ borderRadius: `${(form.widgetBorderRadius ?? 8) / 2}px` }}
                >
                  <span className="text-sm">{s}</span>
                  <button
                    className="text-white text-xs px-3 py-1 font-medium"
                    style={{
                      backgroundColor: form.widgetAccentColor || '#1d4ed8',
                      borderRadius: `${(form.widgetBorderRadius ?? 8) / 2}px`,
                    }}
                  >
                    Boek nu
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embed codes */}
      <div className="space-y-4 pt-6 border-t border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Embedcode</h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Script tag</label>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg text-xs overflow-x-auto break-all whitespace-pre-wrap">
              {embedCode}
            </pre>
            <button
              onClick={() => copyToClipboard(embedCode)}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">iFrame</label>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg text-xs overflow-x-auto break-all whitespace-pre-wrap">
              {iframeCode}
            </pre>
            <button
              onClick={() => copyToClipboard(iframeCode)}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { data: settings, isLoading } = useSalonSettings();
  const updateSettings = useUpdateSalonSettings();
  const [form, setForm] = useState<Partial<SalonSettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading) return <LoadingSpinner />;

  const handleSave = () => {
    updateSettings.mutate({
      confirmationEmailEnabled: form.confirmationEmailEnabled,
      reminderEmailEnabled: form.reminderEmailEnabled,
      reminderHoursBefore: form.reminderHoursBefore,
    });
  };

  const reminderOptions = [
    { value: '1', label: '1 uur' },
    { value: '2', label: '2 uur' },
    { value: '4', label: '4 uur' },
    { value: '12', label: '12 uur' },
    { value: '24', label: '24 uur' },
    { value: '48', label: '48 uur' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Notificatie-instellingen</h2>

      <div className="space-y-4">
        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confirmationEmailEnabled ?? true}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmationEmailEnabled: e.target.checked }))}
            className="w-4 h-4 mt-0.5 text-brand-600 border-gray-300 rounded"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Bevestigingsmails</span>
            <p className="text-sm text-gray-500">Stuur een bevestigingsmail naar de klant na het maken van een afspraak.</p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={form.reminderEmailEnabled ?? true}
            onChange={(e) => setForm((prev) => ({ ...prev, reminderEmailEnabled: e.target.checked }))}
            className="w-4 h-4 mt-0.5 text-brand-600 border-gray-300 rounded"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Herinneringsmails</span>
            <p className="text-sm text-gray-500">Stuur een herinnering naar de klant voor de afspraak.</p>
          </div>
        </label>

        {form.reminderEmailEnabled && (
          <Select
            label="Herinnering sturen"
            options={reminderOptions}
            value={String(form.reminderHoursBefore ?? 24)}
            onChange={(e) => setForm((prev) => ({ ...prev, reminderHoursBefore: Number(e.target.value) }))}
          />
        )}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button onClick={handleSave} loading={updateSettings.isPending}>
          Opslaan
        </Button>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [connecting, setConnecting] = useState(false);

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const { authUrl } = await calendarApi.getAuthUrl();
      window.location.href = authUrl;
    } catch {
      toast.error('Fout bij verbinden met Google');
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Integraties</h2>

      <div className="p-6 border border-gray-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Google Agenda</h3>
            <p className="text-sm text-gray-500 mt-1">
              Synchroniseer afspraken met Google Agenda. Afspraken verschijnen automatisch in de Google Agenda van je medewerkers.
            </p>
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={handleConnectGoogle} loading={connecting}>
                Verbinden met Google
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">
          Meer integraties komen binnenkort beschikbaar. Denk aan Outlook Calendar, iCal, en meer.
        </p>
      </div>
    </div>
  );
}
