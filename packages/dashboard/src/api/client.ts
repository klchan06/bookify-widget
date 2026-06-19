import axios from 'axios';

// In dev: relative /api uses Vite proxy → localhost:3001
// In prod: VITE_API_URL points to the deployed API
const apiBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bookify_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
    // Bij een mislukte login/registratie NIET hard herladen — laat de pagina
    // netjes de foutmelding tonen. Alleen bij een verlopen sessie uitloggen.
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('bookify_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
