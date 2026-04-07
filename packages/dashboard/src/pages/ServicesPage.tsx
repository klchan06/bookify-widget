import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Power } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Table } from '../components/Table';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSpinner } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../hooks/useServices';
import type { Service } from '@bookify/shared';

const CATEGORIES = [
  { value: '', label: 'Geen categorie' },
  { value: 'knippen', label: 'Knippen' },
  { value: 'kleuren', label: 'Kleuren' },
  { value: 'styling', label: 'Styling' },
  { value: 'behandeling', label: 'Behandeling' },
  { value: 'overig', label: 'Overig' },
];

interface ServiceFormData {
  name: string;
  description: string;
  duration: string;
  price: string;
  category: string;
  isActive: boolean;
}

const defaultForm: ServiceFormData = {
  name: '',
  description: '',
  duration: '30',
  price: '',
  category: '',
  isActive: true,
};

export function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (filter === 'active') return services.filter((s) => s.isActive);
    if (filter === 'inactive') return services.filter((s) => !s.isActive);
    return services;
  }, [services, filter]);

  const counts = useMemo(() => ({
    all: services?.length ?? 0,
    active: services?.filter((s) => s.isActive).length ?? 0,
    inactive: services?.filter((s) => !s.isActive).length ?? 0,
  }), [services]);

  const toggleActive = (s: Service) => {
    updateService.mutate({ id: s.id, data: { isActive: !s.isActive } });
  };

  const update = (field: keyof ServiceFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (service: Service) => {
    setForm({
      name: service.name,
      description: service.description || '',
      duration: String(service.duration),
      price: (service.price / 100).toFixed(2),
      category: service.category || '',
      isActive: service.isActive,
    });
    setEditingId(service.id);
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Naam is verplicht';
    if (!form.duration || Number(form.duration) <= 0) errs.duration = 'Geldige duur vereist';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Geldige prijs vereist';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      duration: Number(form.duration),
      price: Math.round(Number(form.price) * 100),
      category: form.category || undefined,
      isActive: form.isActive,
    };

    if (editingId) {
      updateService.mutate({ id: editingId, data }, { onSuccess: () => setShowModal(false) });
    } else {
      createService.mutate(data, { onSuccess: () => setShowModal(false) });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteService.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const dim = (s: Service) => !s.isActive ? 'opacity-50' : '';

  const columns = [
    { key: 'name', header: 'Naam', sortable: true, render: (s: Service) => <span className={dim(s)}>{s.name}</span> },
    {
      key: 'duration',
      header: 'Duur',
      sortable: true,
      render: (s: Service) => <span className={dim(s)}>{s.duration} min</span>,
    },
    {
      key: 'price',
      header: 'Prijs',
      sortable: true,
      render: (s: Service) => <span className={dim(s)}>{formatPrice(s.price)}</span>,
    },
    { key: 'category', header: 'Categorie', sortable: true, render: (s: Service) => <span className={`hidden sm:inline ${dim(s)}`}>{s.category || '-'}</span> },
    {
      key: 'isActive',
      header: 'Status',
      render: (s: Service) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
        }`}>
          {s.isActive ? 'Actief' : 'Inactief'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (s: Service) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); toggleActive(s); }}
            title={s.isActive ? 'Deactiveren' : 'Activeren'}
            className={`p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center ${
              s.isActive ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(s); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const FilterTabs = () => (
    <div className="flex gap-1 border-b border-gray-200">
      {(['active', 'inactive', 'all'] as const).map((f) => (
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
          <span className="ml-1.5 text-xs text-gray-400">({counts[f]})</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diensten</h1>
          <p className="text-gray-500 mt-1">Beheer je diensten en prijzen</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Nieuwe dienst
        </Button>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !services?.length ? (
          <EmptyState
            title="Geen diensten"
            description="Voeg je eerste dienst toe om te beginnen."
            action={
              <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                Dienst toevoegen
              </Button>
            }
          />
        ) : (
          <>
            <div className="px-4 pt-3">
              <FilterTabs />
            </div>
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Geen {filter === 'active' ? 'actieve' : filter === 'inactive' ? 'inactieve' : ''} diensten.
              </div>
            ) : (
              <Table
                columns={columns}
                data={filteredServices}
                keyExtractor={(s) => s.id}
              />
            )}
          </>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Dienst bewerken' : 'Nieuwe dienst'}
      >
        <div className="space-y-4">
          <Input
            label="Naam"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Bijv. Knippen dames"
            error={errors.name}
          />
          <Input
            label="Beschrijving"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Optionele beschrijving"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Duur (minuten)"
              type="number"
              value={form.duration}
              onChange={(e) => update('duration', e.target.value)}
              min="5"
              step="5"
              error={errors.duration}
            />
            <Input
              label="Prijs (EUR)"
              type="number"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              min="0"
              step="0.50"
              placeholder="0.00"
              error={errors.price}
            />
          </div>
          <Select
            label="Categorie"
            options={CATEGORIES}
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Actief (zichtbaar in widget)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              loading={createService.isPending || updateService.isPending}
            >
              {editingId ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Dienst verwijderen"
        message="Weet je zeker dat je deze dienst wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        loading={deleteService.isPending}
      />
    </div>
  );
}
