import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  UserPlus, Upload, Download, Pencil, Trash2, Merge, ArrowLeft,
  Mail, Phone, Calendar, MapPin, Search, UserCircle,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Table } from '../components/Table';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { LoadingSpinner } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import {
  useCustomers, useCustomer, useCustomerBookings,
  useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useImportCustomers, useMergeCustomers,
} from '../hooks/useCustomers';
import { customersApi } from '../api/customers';
import type { Customer } from '@bookify/shared';

// ===== CSV Helpers =====

function downloadCSV(customers: Customer[]) {
  const headers = ['Klantnummer', 'Naam', 'E-mail', 'Telefoon', 'Geboortedatum', 'Adres', 'Stad', 'Postcode', 'Afspraken', 'Totaal besteed', 'Laatste bezoek'];
  const rows = customers.map(c => [
    c.customerNumber || '',
    c.name,
    c.email,
    c.phone || '',
    c.dateOfBirth || '',
    c.address || '',
    c.city || '',
    c.postalCode || '',
    String(c.totalBookings),
    (c.totalSpent / 100).toFixed(2),
    c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('nl-NL') : '',
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `klanten-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse a single CSV line, respecting quoted values
function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Detect separator (comma, semicolon, or tab)
function detectSeparator(line: string): string {
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  if (tabs >= semis && tabs >= commas) return '\t';
  if (semis >= commas) return ';';
  return ',';
}

// Header field aliases (lowercase) → canonical field name
const FIELD_ALIASES: Record<string, string> = {
  // Dutch
  'klantnr': 'customerNumber',
  'klantnummer': 'customerNumber',
  'voornaam': 'firstName',
  'tussenvoegsel': 'middleName',
  'achternaam': 'lastName',
  'naam': 'name',
  'volledige naam': 'name',
  'initialen': 'initials',
  'geboortedatum': 'dateOfBirth',
  'geboorte': 'dateOfBirth',
  'geslacht': 'gender',
  'straat': 'street',
  'huisnr': 'houseNumber',
  'huisnummer': 'houseNumber',
  'huisnr toev.': 'houseNumberAddition',
  'huisnr toev': 'houseNumberAddition',
  'toevoeging': 'houseNumberAddition',
  'postcode': 'postalCode',
  'plaats': 'city',
  'stad': 'city',
  'land': 'country',
  'telefoon': 'phoneLandline',
  'tel': 'phoneLandline',
  'tel.': 'phoneLandline',
  'tel mobiel': 'phone',
  'tel. mobiel': 'phone',
  'mobiel': 'phone',
  'mobiele telefoon': 'phone',
  'gsm': 'phone',
  'e-mail': 'email',
  'email': 'email',
  'e mail': 'email',
  'mail': 'email',
  'status': 'status',
  'gebruikersaccount': 'hasAccount',
  'notities': 'notes',
  'opmerking': 'notes',
  // English
  'first name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'phone': 'phone',
  'mobile': 'phone',
  'date of birth': 'dateOfBirth',
  'dob': 'dateOfBirth',
  'gender': 'gender',
  'street': 'street',
  'city': 'city',
  'postal code': 'postalCode',
  'zip': 'postalCode',
  'zipcode': 'postalCode',
  'country': 'country',
  'notes': 'notes',
};

function normalizeGender(value: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (['m', 'man', 'male', 'heer', 'mr'].includes(v)) return 'male';
  if (['v', 'vrouw', 'f', 'female', 'mevrouw', 'mw'].includes(v)) return 'female';
  return undefined;
}

function normalizeDate(value: string): string | undefined {
  if (!value || !value.trim()) return undefined;
  const v = value.trim();
  // Try DD-MM-YYYY or DD/MM/YYYY
  let m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // Try YYYY-MM-DD
  m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return undefined;
}

function parseCSV(text: string): Partial<Customer>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const sep = detectSeparator(lines[0]);
  const headerCells = parseCSVLine(lines[0], sep).map((h) =>
    h.toLowerCase().replace(/^["']|["']$/g, '').trim()
  );

  // Detect if first row is a header (contains known field names)
  const hasHeader = headerCells.some((h) => FIELD_ALIASES[h] !== undefined);

  if (!hasHeader) {
    // Fallback: heuristic per-row parsing
    const result: Partial<Customer>[] = [];
    for (const line of lines) {
      const parts = parseCSVLine(line, sep);
      const emailIdx = parts.findIndex((p) => p.includes('@'));
      const phoneIdx = parts.findIndex((p) => /^(\+|0)[0-9 -]{6,}$/.test(p));
      const email = emailIdx >= 0 ? parts[emailIdx] : '';
      const phone = phoneIdx >= 0 ? parts[phoneIdx] : '';
      const nameIdx = parts.findIndex((_, i) => i !== emailIdx && i !== phoneIdx && parts[i].length > 0);
      const name = nameIdx >= 0 ? parts[nameIdx] : '';
      if (!email && !phone) continue;
      result.push({ name, email, phone: phone || undefined });
    }
    return result;
  }

  // Header-based parsing
  const fieldMap: Record<number, string> = {};
  headerCells.forEach((h, i) => {
    const field = FIELD_ALIASES[h];
    if (field) fieldMap[i] = field;
  });

  return lines
    .slice(1)
    .map((line) => {
      const parts = parseCSVLine(line, sep);
      const raw: Record<string, string> = {};
      parts.forEach((value, i) => {
        const field = fieldMap[i];
        if (field && value) raw[field] = value;
      });

      // Build full name
      const nameParts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
      const name = raw.name || nameParts.join(' ').trim();

      // Build address
      const addressParts = [raw.street, raw.houseNumber, raw.houseNumberAddition].filter(Boolean);
      const address = addressParts.join(' ').trim();

      // Use mobile if available, else landline
      const phone = raw.phone || raw.phoneLandline;

      // Skip rows with no email AND no phone
      if (!raw.email && !phone) return null;

      const customer: Partial<Customer> = {
        firstName: raw.firstName || undefined,
        lastName: [raw.middleName, raw.lastName].filter(Boolean).join(' ') || undefined,
        name: name || raw.email || phone || 'Onbekend',
        email: raw.email || '',
        phone: phone || undefined,
        dateOfBirth: normalizeDate(raw.dateOfBirth || ''),
        gender: normalizeGender(raw.gender || ''),
        address: address || undefined,
        city: raw.city || undefined,
        postalCode: raw.postalCode || undefined,
      };

      return customer;
    })
    .filter((c): c is Partial<Customer> => c !== null);
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);

// ===== Main Page =====

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const { data: customers, isLoading } = useCustomers(search || undefined, filter !== 'active');
  const filteredCustomers = React.useMemo(() => {
    if (!customers) return [];
    if (filter === 'inactive') return customers.filter((c) => !c.isActive);
    if (filter === 'all') return customers;
    return customers.filter((c) => c.isActive);
  }, [customers, filter]);

  if (selectedId) {
    return <CustomerDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const allCustomers = await customersApi.export();
      downloadCSV(allCustomers);
    } catch {
      // toast handled in api layer
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    {
      key: 'customerNumber',
      header: 'Nr.',
      render: (c: Customer) => (
        <span className="hidden md:inline text-gray-500 text-xs">{c.customerNumber || '-'}</span>
      ),
    },
    {
      key: 'name',
      header: 'Naam',
      sortable: true,
      render: (c: Customer) => (
        <div className={`flex items-center gap-3 ${!c.isActive ? 'opacity-50' : ''}`}>
          <Avatar name={c.name} size="sm" />
          <button
            className="font-medium text-brand-600 hover:text-brand-800 hover:underline text-left"
            onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
          >
            {c.name}
          </button>
          {!c.isActive && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
              Inactief
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefoon',
      render: (c: Customer) => <span>{c.phone || '-'}</span>,
    },
    { key: 'email', header: 'E-mail', sortable: true },
    {
      key: 'createdAt',
      header: 'Aangemaakt',
      sortable: true,
      render: (c: Customer) => (
        <span className="hidden md:inline text-sm text-gray-500">
          {format(new Date(c.createdAt), 'd MMM yyyy', { locale: nl })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c: Customer) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
            className="p-1.5 text-gray-400 hover:text-brand-600 rounded-md hover:bg-gray-100"
            title="Bewerken"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klanten</h1>
          <p className="text-gray-500 mt-1">{customers?.length ?? 0} klanten</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Klant aanmaken
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowImportModal(true)}
          >
            Importeren
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            loading={exportLoading}
          >
            Exporteren
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['active', 'inactive', 'all'] as const).map((f) => {
          const count = f === 'active'
            ? customers?.filter((c) => c.isActive).length ?? 0
            : f === 'inactive'
              ? customers?.filter((c) => !c.isActive).length ?? 0
              : customers?.length ?? 0;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filter === f
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'active' ? 'Actief' : f === 'inactive' ? 'Inactief' : 'Alle'}
              <span className="ml-1.5 text-xs text-gray-400">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, e-mail of telefoon..."
          className="input-field pl-10"
        />
      </div>

      {/* Table */}
      <div className="card p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !filteredCustomers.length ? (
          <EmptyState
            title="Geen klanten gevonden"
            description={search ? 'Probeer een andere zoekterm.' : 'Klanten worden automatisch aangemaakt bij boekingen.'}
            icon={<UserCircle className="w-8 h-8" />}
          />
        ) : (
          <Table
            columns={columns}
            data={filteredCustomers}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => setSelectedId(c.id)}
          />
        )}
      </div>

      {/* Create Modal */}
      <CustomerFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}

// ===== Customer Detail =====

function CustomerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: customer, isLoading } = useCustomer(id);
  const { data: bookings, isLoading: bookingsLoading } = useCustomerBookings(id);
  const deleteMutation = useDeleteCustomer();
  const updateMutation = useUpdateCustomer();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (!customer) return <EmptyState title="Klant niet gevonden" />;

  const formatDate = (d: string) => format(new Date(d), 'd MMMM yyyy', { locale: nl });

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onBack();
      },
    });
  };

  const genderLabel = (g?: string) => {
    if (g === 'male') return 'Man';
    if (g === 'female') return 'Vrouw';
    if (g === 'other') return 'Anders';
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Terug naar klanten
      </button>

      {/* Customer info card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={customer.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
                {!customer.isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                    Inactief
                  </span>
                )}
              </div>
              {customer.customerNumber && (
                <p className="text-xs text-gray-400 mt-0.5">#{customer.customerNumber}</p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> {customer.email}
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {customer.phone}
                  </span>
                )}
              </div>

              {/* Additional details */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                {customer.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {formatDate(customer.dateOfBirth)}
                  </span>
                )}
                {(customer.address || customer.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {[customer.address, customer.postalCode, customer.city].filter(Boolean).join(', ')}
                  </span>
                )}
                {customer.gender && (
                  <span>{genderLabel(customer.gender)}</span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-gray-500">
                  <strong className="text-gray-900">{customer.totalBookings}</strong> afspraken
                </span>
                <span className="text-gray-500">
                  Totaal besteed: <strong className="text-gray-900">{formatPrice(customer.totalSpent)}</strong>
                </span>
                {customer.lastVisit && (
                  <span className="text-gray-500">
                    Laatste bezoek: <strong className="text-gray-900">{formatDate(customer.lastVisit)}</strong>
                  </span>
                )}
              </div>

              {customer.notes && (
                <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">{customer.notes}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="w-4 h-4" />}
              onClick={() => setShowEditModal(true)}
            >
              Bewerken
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Merge className="w-4 h-4" />}
              onClick={() => setShowMergeModal(true)}
            >
              Samenvoegen
            </Button>
            {customer.isActive ? (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Verwijderen
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => updateMutation.mutate({ id: customer.id, data: { isActive: true } as Partial<Customer> })}
                loading={updateMutation.isPending}
              >
                Reactiveren
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Afspraakgeschiedenis</h2>
        {bookingsLoading ? (
          <LoadingSpinner />
        ) : !bookings?.length ? (
          <EmptyState title="Geen afspraken" description="Deze klant heeft nog geen afspraken." />
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 py-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {format(new Date(booking.date + 'T00:00:00'), 'd MMM yyyy', { locale: nl })}
                    </p>
                    <p className="text-gray-500">{booking.startTime} - {booking.endTime}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking.service?.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {booking.employee?.name}
                    </p>
                  </div>
                  <Badge status={booking.status} />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <CustomerFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        mode="edit"
        customer={customer}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Klant verwijderen"
        message="Weet je zeker dat je deze klant wilt deactiveren? De klantgegevens blijven bewaard maar de klant wordt als inactief gemarkeerd."
        confirmLabel="Verwijderen"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Merge Modal */}
      <MergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        customer={customer}
      />
    </div>
  );
}

// ===== Customer Form Modal (Create / Edit) =====

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  customer?: Customer;
}

function CustomerFormModal({ isOpen, onClose, mode, customer }: CustomerFormModalProps) {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const [form, setForm] = useState<Partial<Customer>>({});

  React.useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && customer) {
        setForm({
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email,
          phone: customer.phone || '',
          dateOfBirth: customer.dateOfBirth || '',
          address: customer.address || '',
          city: customer.city || '',
          postalCode: customer.postalCode || '',
          gender: customer.gender || '',
          notes: customer.notes || '',
        });
      } else {
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          address: '',
          city: '',
          postalCode: '',
          gender: '',
          notes: '',
        });
      }
    }
  }, [isOpen, mode, customer]);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      name: [form.firstName, form.lastName].filter(Boolean).join(' ') || form.email || '',
    };

    if (mode === 'create') {
      createMutation.mutate(data, { onSuccess: onClose });
    } else if (customer) {
      updateMutation.mutate({ id: customer.id, data }, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const genderOptions = [
    { value: 'male', label: 'Man' },
    { value: 'female', label: 'Vrouw' },
    { value: 'other', label: 'Anders' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nieuwe klant' : 'Klant bewerken'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Voornaam"
            value={form.firstName || ''}
            onChange={(e) => updateField('firstName', e.target.value)}
            required
          />
          <Input
            label="Achternaam"
            value={form.lastName || ''}
            onChange={(e) => updateField('lastName', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="E-mail"
            type="email"
            value={form.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
          <Input
            label="Telefoon"
            type="tel"
            value={form.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Geboortedatum"
            type="date"
            value={form.dateOfBirth || ''}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
          />
          <Select
            label="Geslacht"
            value={form.gender || ''}
            onChange={(e) => updateField('gender', e.target.value)}
            options={genderOptions}
            placeholder="Selecteer..."
          />
        </div>

        <Input
          label="Adres"
          value={form.address || ''}
          onChange={(e) => updateField('address', e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Postcode"
            value={form.postalCode || ''}
            onChange={(e) => updateField('postalCode', e.target.value)}
          />
          <Input
            label="Stad"
            value={form.city || ''}
            onChange={(e) => updateField('city', e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Notities</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={3}
            className="input-field"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
            Annuleren
          </Button>
          <Button type="submit" loading={isPending}>
            {mode === 'create' ? 'Aanmaken' : 'Opslaan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ===== Import Modal =====

function ImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const importMutation = useImportCustomers();
  const [csvText, setCsvText] = useState('');
  const [parsedCustomers, setParsedCustomers] = useState<Partial<Customer>[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number; updated: number; skipped: number; total: number; errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCsvText('');
      setParsedCustomers([]);
      setImportResult(null);
    }
  }, [isOpen]);

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (text.trim()) {
      setParsedCustomers(parseCSV(text));
    } else {
      setParsedCustomers([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsedCustomers(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedCustomers.length) return;
    importMutation.mutate(parsedCustomers, {
      onSuccess: (data) => {
        setImportResult(data);
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Klanten importeren" size="lg">
      <div className="space-y-4">
        {importResult ? (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">Import voltooid</p>
              <ul className="mt-2 text-sm text-green-700 space-y-1">
                <li>{importResult.imported} nieuwe klanten geïmporteerd</li>
                <li>{importResult.updated} bestaande klanten bijgewerkt</li>
                <li>{importResult.skipped} overgeslagen</li>
              </ul>
            </div>
            {importResult.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Fouten:</p>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={onClose}>Sluiten</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Plak CSV-data hieronder (naam, e-mail, telefoon per regel) of upload een CSV-bestand.
            </p>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">CSV-data</label>
              <textarea
                value={csvText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={8}
                className="input-field font-mono text-sm"
                placeholder={"Jan Jansen;jan@email.nl;0612345678\nPiet Pietersen;piet@email.nl;0698765432"}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">of</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                CSV-bestand kiezen
              </Button>
            </div>

            {parsedCustomers.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                {parsedCustomers.length} klant(en) gevonden om te importeren.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose}>Annuleren</Button>
              <Button
                onClick={handleImport}
                disabled={!parsedCustomers.length}
                loading={importMutation.isPending}
              >
                Importeren ({parsedCustomers.length})
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ===== Merge Modal =====

function MergeModal({ isOpen, onClose, customer }: { isOpen: boolean; onClose: () => void; customer: Customer }) {
  const mergeMutation = useMergeCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedDuplicate, setSelectedDuplicate] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedDuplicate(null);
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await customersApi.search(query);
      setSearchResults(results.filter(c => c.id !== customer.id));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleMerge = () => {
    if (!selectedDuplicate) return;
    mergeMutation.mutate(
      { keepId: customer.id, mergeIds: [selectedDuplicate.id] },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Klanten samenvoegen" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Zoek de duplicaat klant op. Alle afspraken van de duplicaat worden verplaatst naar{' '}
          <strong>{customer.name}</strong>.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Zoek duplicaat op naam of e-mail..."
            className="input-field pl-10"
          />
        </div>

        {/* Search results */}
        {searching && <LoadingSpinner />}
        {searchResults.length > 0 && !selectedDuplicate && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {searchResults.map((c) => (
              <button
                key={c.id}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                onClick={() => setSelectedDuplicate(c)}
              >
                <Avatar name={c.name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email} {c.phone && `| ${c.phone}`}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Side by side comparison */}
        {selectedDuplicate && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-700 uppercase mb-2">Behouden</p>
              <p className="font-medium text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-600">{customer.email}</p>
              <p className="text-sm text-gray-600">{customer.phone || '-'}</p>
              <p className="text-sm text-gray-500 mt-1">{customer.totalBookings} afspraken</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700 uppercase mb-2">Samenvoegen (verwijderd)</p>
              <p className="font-medium text-gray-900">{selectedDuplicate.name}</p>
              <p className="text-sm text-gray-600">{selectedDuplicate.email}</p>
              <p className="text-sm text-gray-600">{selectedDuplicate.phone || '-'}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedDuplicate.totalBookings} afspraken</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Annuleren</Button>
          {selectedDuplicate && (
            <Button
              onClick={handleMerge}
              loading={mergeMutation.isPending}
              icon={<Merge className="w-4 h-4" />}
            >
              Samenvoegen
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
