import React, { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
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

  const columns = [
    { key: 'name', header: 'Naam', sortable: true },
    {
      key: 'duration',
      header: 'Duur',
      sortable: true,
      render: (s: Service) => `${s.duration} min`,
    },
    {
      key: 'price',
      header: 'Prijs',
      sortable: true,
      render: (s: Service) => formatPrice(s.price),
    },
    { key: 'category', header: 'Categorie', sortable: true, render: (s: Service) => s.category || '-' },
    {
      key: 'isActive',
      header: 'Status',
      render: (s: Service) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
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
            onClick={(e) => { e.stopPropagation(); openEdit(s); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

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
          <Table
            columns={columns}
            data={services}
            keyExtractor={(s) => s.id}
          />
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
          <div className="grid grid-cols-2 gap-4">
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
