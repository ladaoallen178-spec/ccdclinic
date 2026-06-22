import api from './api';

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

  if (!token || !user || token === 'demo-clinic-session') {
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
