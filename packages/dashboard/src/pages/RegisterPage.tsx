import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    salonName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.salonName) errs.salonName = 'Salonnaam is verplicht';
    if (!form.ownerName) errs.ownerName = 'Naam is verplicht';
    if (!form.email) errs.email = 'E-mail is verplicht';
    if (!form.password) errs.password = 'Wachtwoord is verplicht';
    else if (form.password.length < 8) errs.password = 'Minimaal 8 tekens';
    if (!form.phone) errs.phone = 'Telefoonnummer is verplicht';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register(form);
      toast.success('Account aangemaakt!');
      navigate('/');
    } catch {
      toast.error('Registratie mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Calendar className="w-10 h-10 text-brand-600" />
            <span className="text-3xl font-bold text-gray-900">Bookify</span>
          </div>
          <p className="text-gray-500">Registreer je salon</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Salonnaam"
              value={form.salonName}
              onChange={(e) => update('salonName', e.target.value)}
              placeholder="Bijv. Kapsalon De Schaar"
              error={errors.salonName}
            />
            <Input
              label="Naam eigenaar"
              value={form.ownerName}
              onChange={(e) => update('ownerName', e.target.value)}
              placeholder="Je volledige naam"
              error={errors.ownerName}
            />
            <Input
              label="E-mailadres"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="naam@voorbeeld.nl"
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Wachtwoord"
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Minimaal 8 tekens"
              error={errors.password}
              autoComplete="new-password"
            />
            <Input
              label="Telefoonnummer"
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="06-12345678"
              error={errors.phone}
            />

            <Button type="submit" loading={loading} className="w-full">
              Account aanmaken
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Heb je al een account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
