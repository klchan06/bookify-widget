import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import toast from 'react-hot-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = 'E-mail is verplicht';
    if (!password) errs.password = 'Wachtwoord is verplicht';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welkom terug!');
      navigate('/');
    } catch {
      toast.error('Ongeldige inloggegevens');
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
            <span className="text-3xl font-bold text-gray-900">Boekgerust</span>
          </div>
          <p className="text-gray-500">Log in op je dashboard</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mailadres"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Wachtwoord"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Je wachtwoord"
              error={errors.password}
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <button type="button" className="text-sm text-brand-600 hover:text-brand-700">
                Wachtwoord vergeten?
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Inloggen
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Nog geen account?{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
            Registreer je salon
          </Link>
        </p>
      </div>
    </div>
  );
}
