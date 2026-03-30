import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Clock, Calendar } from 'lucide-react';
import { DAYS_OF_WEEK } from '@bookify/shared';
import type { Employee, EmployeeRole, WorkingHours } from '@bookify/shared';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSpinner } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import { TimePicker } from '../components/TimePicker';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useWorkingHours,
  useUpdateWorkingHours,
} from '../hooks/useEmployees';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Medewerker' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Eigenaar' },
];

const ROLE_LABELS: Record<EmployeeRole, string> = {
  owner: 'Eigenaar',
  admin: 'Admin',
  employee: 'Medewerker',
};

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  password: string;
}

const defaultForm: EmployeeFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'employee',
  password: '',
};

export function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [showModal, setShowModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      role: emp.role,
      password: '',
    });
    setEditingId(emp.id);
    setErrors({});
    setShowModal(true);
  };

  const openHours = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowHoursModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Naam is verplicht';
    if (!form.email.trim()) errs.email = 'E-mail is verplicht';
    if (!editingId && !form.password) errs.password = 'Wachtwoord is verplicht';
    if (!editingId && form.password.length < 8) errs.password = 'Minimaal 8 tekens';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
    };

    if (form.password) data.password = form.password;

    if (editingId) {
      updateEmployee.mutate(
        { id: editingId, data: data as Partial<Employee> },
        { onSuccess: () => setShowModal(false) }
      );
    } else {
      createEmployee.mutate(
        data as Partial<Employee> & { password?: string },
        { onSuccess: () => setShowModal(false) }
      );
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteEmployee.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medewerkers</h1>
          <p className="text-gray-500 mt-1">Beheer je team en werkuren</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Nieuwe medewerker
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !employees?.length ? (
        <div className="card">
          <EmptyState
            title="Geen medewerkers"
            description="Voeg medewerkers toe aan je salon."
            action={
              <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                Medewerker toevoegen
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="card flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={emp.name} imageUrl={emp.avatarUrl} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{emp.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{emp.email}</p>
                  {emp.phone && <p className="text-sm text-gray-500">{emp.phone}</p>}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    emp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {ROLE_LABELS[emp.role]}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                <Button size="sm" variant="ghost" icon={<Clock className="w-4 h-4" />} onClick={() => openHours(emp)}>
                  Werkuren
                </Button>
                <Button size="sm" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(emp)}>
                  Bewerk
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setDeleteId(emp.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Medewerker bewerken' : 'Nieuwe medewerker'}
      >
        <div className="space-y-4">
          <Input
            label="Naam"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Volledige naam"
            error={errors.name}
          />
          <Input
            label="E-mailadres"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="naam@voorbeeld.nl"
            error={errors.email}
          />
          <Input
            label="Telefoonnummer"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="06-12345678"
          />
          <Select
            label="Rol"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
          />
          <Input
            label={editingId ? 'Nieuw wachtwoord (laat leeg om niet te wijzigen)' : 'Wachtwoord'}
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder={editingId ? 'Laat leeg' : 'Minimaal 8 tekens'}
            error={errors.password}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              loading={createEmployee.isPending || updateEmployee.isPending}
            >
              {editingId ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Working hours modal */}
      {selectedEmployee && (
        <WorkingHoursModal
          isOpen={showHoursModal}
          onClose={() => { setShowHoursModal(false); setSelectedEmployee(null); }}
          employee={selectedEmployee}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Medewerker verwijderen"
        message="Weet je zeker dat je deze medewerker wilt verwijderen? Alle gekoppelde afspraken blijven behouden."
        confirmLabel="Verwijderen"
        loading={deleteEmployee.isPending}
      />
    </div>
  );
}

// Working Hours Sub-modal
function WorkingHoursModal({
  isOpen,
  onClose,
  employee,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}) {
  const { data: workingHours, isLoading } = useWorkingHours(employee.id);
  const updateHours = useUpdateWorkingHours();

  const [hours, setHours] = useState<Record<number, { isWorking: boolean; startTime: string; endTime: string }>>({});

  React.useEffect(() => {
    if (workingHours) {
      const map: typeof hours = {};
      for (let d = 0; d < 7; d++) {
        const wh = workingHours.find((h) => h.dayOfWeek === d);
        map[d] = {
          isWorking: wh?.isWorking ?? (d >= 1 && d <= 5),
          startTime: wh?.startTime ?? '09:00',
          endTime: wh?.endTime ?? '17:00',
        };
      }
      setHours(map);
    }
  }, [workingHours]);

  const handleSave = () => {
    const data = Object.entries(hours).map(([day, vals]) => ({
      dayOfWeek: Number(day),
      ...vals,
    }));
    updateHours.mutate({ id: employee.id, hours: data }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Werkuren - ${employee.name}`} size="lg">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
              <div className="w-16 sm:w-24 text-sm font-medium text-gray-700 flex-shrink-0">
                {DAYS_OF_WEEK[day]}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hours[day]?.isWorking ?? false}
                  onChange={(e) =>
                    setHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], isWorking: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded"
                />
              </label>
              {hours[day]?.isWorking && (
                <>
                  <TimePicker
                    value={hours[day]?.startTime ?? '09:00'}
                    onChange={(t) =>
                      setHours((prev) => ({ ...prev, [day]: { ...prev[day], startTime: t } }))
                    }
                  />
                  <span className="text-gray-400">-</span>
                  <TimePicker
                    value={hours[day]?.endTime ?? '17:00'}
                    onChange={(t) =>
                      setHours((prev) => ({ ...prev, [day]: { ...prev[day], endTime: t } }))
                    }
                  />
                </>
              )}
              {!hours[day]?.isWorking && (
                <span className="text-sm text-gray-400">Vrij</span>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <Button onClick={handleSave} loading={updateHours.isPending}>
              Opslaan
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
