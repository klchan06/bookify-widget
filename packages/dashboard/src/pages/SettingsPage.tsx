import React, { useState, useEffect } from 'react';
import { Building2, Calendar, Palette, Bell, Link2, Copy, Check, Pencil } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { ColorPicker } from '../components/ColorPicker';
import { LoadingSpinner } from '../components/LoadingScreen';
import { useSalon, useSalonSettings, useUpdateSalon, useUpdateSalonSettings, useEmailTemplates, useUpdateEmailTemplate } from '../hooks/useSalon';
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
      logoUrl: form.logoUrl,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Bedrijfsgegevens</h2>

      {/* Logo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Logo</label>
        <div className="flex items-start gap-4">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt="Logo"
              className="w-20 h-20 rounded-lg object-contain bg-gray-50 border border-gray-200 flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <div className="flex-1">
            <Input
              value={form.logoUrl || ''}
              onChange={(e) => update('logoUrl', e.target.value)}
              placeholder="https://voorbeeld.nl/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Plak hier de URL van je logo. Het logo verschijnt in bevestigingsmails naar klanten.
            </p>
          </div>
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Gekopieerd naar klembord');
    setTimeout(() => setCopiedField(null), 2000);
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

        {/* Salon ID */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Salon ID</label>
          <div className="flex gap-2 items-center">
            <code className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-sm font-mono flex-1 select-all">
              {salon?.id || 'Laden...'}
            </code>
            <button
              onClick={() => copyToClipboard(salon?.id || '', 'salonId')}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              title="Kopieer Salon ID"
            >
              {copiedField === 'salonId' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Script tag (aanbevolen)</label>
          <p className="text-xs text-gray-500">Plak deze code in je website HTML, vlak voor de sluitende &lt;/body&gt; tag.</p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg text-xs overflow-x-auto break-all whitespace-pre-wrap">
              {embedCode}
            </pre>
            <button
              onClick={() => copyToClipboard(embedCode, 'script')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              {copiedField === 'script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">iFrame alternatief</label>
          <p className="text-xs text-gray-500">Gebruik dit als alternatief wanneer je geen scripts kunt toevoegen.</p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg text-xs overflow-x-auto break-all whitespace-pre-wrap">
              {iframeCode}
            </pre>
            <button
              onClick={() => copyToClipboard(iframeCode, 'iframe')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              {copiedField === 'iframe' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      {salon?.slug && (
        <div className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Live voorbeeld</h3>
          <p className="text-sm text-gray-500">Zo ziet de widget eruit op je website.</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <iframe
              src={`${window.location.origin}/widget/${salon.slug}`}
              width="100%"
              height="600"
              style={{ border: 'none' }}
              title="Widget voorbeeld"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const TEMPLATE_LABELS: Record<string, string> = {
  'booking_confirmation': 'Afspraakbevestiging',
  'booking_reminder': 'Afspraakherinnering',
  'booking_cancellation': 'Bevestiging van annulering',
  'booking_update': 'Afspraak verzet bevestiging',
  'customer_invite': 'Consumenten uitnodigen',
};

const TEMPLATE_VARIABLES = [
  { var: '%KLANT.NAAM%', desc: 'Naam van de klant' },
  { var: '%KLANT.EMAIL%', desc: 'E-mailadres van de klant' },
  { var: '%AFSPRAAK.DIENST%', desc: 'Naam van de dienst' },
  { var: '%AFSPRAAK.DATUM%', desc: 'Datum van de afspraak' },
  { var: '%AFSPRAAK.TIJD%', desc: 'Tijd van de afspraak' },
  { var: '%AFSPRAAK.MEDEWERKER%', desc: 'Naam van de medewerker' },
  { var: '%AFSPRAAK.DUUR%', desc: 'Duur in minuten' },
  { var: '%AFSPRAAK.PRIJS%', desc: 'Prijs van de dienst' },
  { var: '%SALON.NAAM%', desc: 'Naam van het bedrijf' },
  { var: '%SALON.ADRES%', desc: 'Adres van het bedrijf' },
  { var: '%SALON.STAD%', desc: 'Stad van het bedrijf' },
  { var: '%SALON.TELEFOON%', desc: 'Telefoonnummer' },
  { var: '%SALON.EMAIL%', desc: 'E-mailadres' },
];

function NotificationsTab() {
  const { data: settings, isLoading: settingsLoading } = useSalonSettings();
  const updateSettings = useUpdateSalonSettings();
  const [settingsForm, setSettingsForm] = useState<Partial<SalonSettings>>({});

  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', body: '', isActive: true });

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  const handleSettingsSave = () => {
    updateSettings.mutate({
      confirmationEmailEnabled: settingsForm.confirmationEmailEnabled,
      reminderEmailEnabled: settingsForm.reminderEmailEnabled,
      reminderHoursBefore: settingsForm.reminderHoursBefore,
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

  const openEdit = (template: any) => {
    setEditingTemplate(template);
    setEditForm({ subject: template.subject, body: template.body, isActive: template.isActive });
    setPreview(null);
  };

  const handleSave = () => {
    updateTemplate.mutate(
      { type: editingTemplate.type, data: editForm },
      { onSuccess: () => setEditingTemplate(null) }
    );
  };

  const handlePreview = async () => {
    try {
      const result = await salonApi.previewEmailTemplate(editingTemplate.type);
      setPreview(result);
    } catch {
      toast.error('Fout bij laden voorbeeld');
    }
  };

  if (settingsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Notification settings */}
      <div className="space-y-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900">Notificatie-instellingen</h2>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsForm.confirmationEmailEnabled ?? true}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, confirmationEmailEnabled: e.target.checked }))}
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
              checked={settingsForm.reminderEmailEnabled ?? true}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, reminderEmailEnabled: e.target.checked }))}
              className="w-4 h-4 mt-0.5 text-brand-600 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Herinneringsmails</span>
              <p className="text-sm text-gray-500">Stuur een herinnering naar de klant voor de afspraak.</p>
            </div>
          </label>

          {settingsForm.reminderEmailEnabled && (
            <Select
              label="Herinnering sturen"
              options={reminderOptions}
              value={String(settingsForm.reminderHoursBefore ?? 24)}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, reminderHoursBefore: Number(e.target.value) }))}
            />
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Button onClick={handleSettingsSave} loading={updateSettings.isPending}>
            Opslaan
          </Button>
        </div>
      </div>

      {/* Email templates */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">E-mail templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            Pas de inhoud van automatische e-mails aan. Gebruik variabelen zoals %KLANT.NAAM% die automatisch worden ingevuld.
          </p>
        </div>

        {templatesLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {(templates || []).map((template: any) => (
              <div key={template.type} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {TEMPLATE_LABELS[template.type] || template.type}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {template.isActive ? 'Actief' : 'Inactief'}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(template)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingTemplate && (
          <Modal isOpen onClose={() => setEditingTemplate(null)} title={`Template bewerken: ${TEMPLATE_LABELS[editingTemplate.type] || editingTemplate.type}`} size="lg">
            <div className="space-y-4">
              <Input
                label="Onderwerp"
                value={editForm.subject}
                onChange={(e) => setEditForm(f => ({ ...f, subject: e.target.value }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inhoud (HTML)</label>
                <textarea
                  value={editForm.body}
                  onChange={(e) => setEditForm(f => ({ ...f, body: e.target.value }))}
                  rows={12}
                  className="input-field font-mono text-sm"
                />
              </div>

              {/* Available variables */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Beschikbare variabelen</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.var}
                      type="button"
                      className="text-left text-xs px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(v.var);
                        toast.success(`${v.var} gekopieerd`);
                      }}
                    >
                      <code className="text-brand-600">{v.var}</code>
                      <span className="text-gray-500 ml-1">- {v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm text-gray-700">Template actief</span>
              </label>

              {/* Preview */}
              {preview && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <p className="text-sm font-medium text-gray-500 mb-1">Voorbeeld:</p>
                  <p className="font-semibold text-gray-900 mb-2">{preview.subject}</p>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview.body }} />
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="secondary" onClick={handlePreview}>
                  Voorbeeld bekijken
                </Button>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setEditingTemplate(null)}>Annuleren</Button>
                  <Button onClick={handleSave} loading={updateTemplate.isPending}>Opslaan</Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [connecting, setConnecting] = useState(false);
  const [feedUrls, setFeedUrls] = useState<{ personalFeed: string; salonFeed: string } | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);

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

  const loadFeedUrls = async () => {
    setFeedLoading(true);
    try {
      const urls = await calendarApi.getFeedUrls();
      setFeedUrls(urls);
    } catch {
      toast.error('Fout bij ophalen feed URLs');
    } finally {
      setFeedLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Integraties</h2>

      {/* iCal Feed Section */}
      <div className="p-6 border border-gray-200 rounded-lg space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Agenda synchronisatie</h3>
          <p className="text-sm text-gray-500 mt-1">
            Synchroniseer afspraken met je iPhone, Outlook of andere agenda-app via een iCal feed URL.
          </p>
        </div>

        {!feedUrls ? (
          <Button onClick={loadFeedUrls} loading={feedLoading}>
            Feed URLs genereren
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jouw persoonlijke agenda
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={feedUrls.personalFeed}
                    className="input-field text-sm flex-1 font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="secondary" onClick={() => {
                    navigator.clipboard.writeText(feedUrls.personalFeed);
                    toast.success('URL gekopieerd');
                  }}>
                    Kopieren
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Alleen jouw afspraken</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hele salon agenda
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={feedUrls.salonFeed}
                    className="input-field text-sm flex-1 font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="secondary" onClick={() => {
                    navigator.clipboard.writeText(feedUrls.salonFeed);
                    toast.success('URL gekopieerd');
                  }}>
                    Kopieren
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Alle afspraken van alle medewerkers</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-2">Hoe te gebruiken:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>iPhone:</strong> Instellingen &rarr; Agenda &rarr; Accounts &rarr; Voeg account toe &rarr; Anders &rarr; Voeg agenda-abonnement toe &rarr; Plak de URL</li>
                <li><strong>Outlook:</strong> Agenda &rarr; Agenda toevoegen &rarr; Van internet &rarr; Plak de URL</li>
                <li><strong>Google Agenda:</strong> Andere agenda&apos;s &rarr; Op URL &rarr; Plak de URL</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Google Calendar Section */}
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
    </div>
  );
}
