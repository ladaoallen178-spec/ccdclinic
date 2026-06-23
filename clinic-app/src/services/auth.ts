import api from './api';
import { getNurses } from '../utils/clinicData';

export interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    fullname: string;
    email: string;
    role: string;
  };
  token?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  console.log('[AUTH] Login attempt', { email });

  try {
    const response = await api.post<LoginResponse>('/login', { email, password });
    const data = response.data;

    console.log('[AUTH] Login response', {
      url: response.config.url,
      status: response.status,
      data: {
        hasToken: Boolean(data.token),
        userEmail: data.user?.email,
      },
    });

    if (data.token && data.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return { success: true, token: data.token, user: data.user };
    }

    return { success: false, message: data.error || data.message || 'Invalid email or password.' };
  } catch (error: any) {
    console.error('[AUTH] Login error', error?.response?.data || error.message || error);

    if (import.meta.env.DEV && isNetworkError(error)) {
      return loginWithLocalSession(email, password);
    }

    const msg = error.response?.data?.error || error.message || 'Network error. Please try again.';
    return { success: false, message: msg };
  }
};

const LOGIN_REDIRECT = '/login';

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = LOGIN_REDIRECT;
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    return false;
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return false;
  }

  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

function loginWithLocalSession(email: string, password: string): LoginResponse {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password.trim()) {
    return { success: false, message: 'Enter your email and password.' };
  }

  const nurse = getNurses().find((item) => item.email.toLowerCase() === normalizedEmail);
  const user = nurse
    ? {
        id: nurse.id,
        fullname: nurse.name,
        email: nurse.email,
        role: nurse.role,
      }
    : {
        id: `LOCAL-${Date.now()}`,
        fullname: normalizedEmail.split('@')[0] || 'Local User',
        email: normalizedEmail,
        role: 'Nurse',
      };
  const token = createLocalJwt(user.id, user.email);

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return {
    success: true,
    message: 'Using local testing session because the backend is offline.',
    token,
    user,
  };
}

function createLocalJwt(userId: string, email: string) {
  const header = toBase64Url({ alg: 'none', typ: 'JWT' });
  const payload = toBase64Url({
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  });
  return `${header}.${payload}.local`;
}

function toBase64Url(value: Record<string, unknown>) {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function isNetworkError(error: unknown) {
  return error instanceof Error && /failed to fetch|network error|load failed/i.test(error.message);
}
