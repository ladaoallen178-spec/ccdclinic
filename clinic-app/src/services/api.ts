const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '/api');
const APP_BASE_URL = '';
const REQUEST_TIMEOUT_MS = 5000;

interface ApiResponse<T> {
  config: {
    baseURL: string;
    url: string;
  };
  status: number;
  data: T;
}

interface ApiError extends Error {
  response?: {
    status: number;
    data: {
      error?: string;
    };
  };
}

const maskPassword = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const safeData = { ...(data as Record<string, unknown>) };
  if (typeof safeData.password === 'string') {
    safeData.password = '********';
  }

  return safeData;
};

const request = async <T>(method: string, url: string, data?: unknown): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const loggedHeaders = {
    ...headers,
    ...(headers.Authorization ? { Authorization: 'Bearer ********' } : {}),
  };

  console.debug('[API] Request', {
    method,
    url: `${API_BASE_URL}${url}`,
    data: maskPassword(data),
    headers: loggedHeaders,
  });


  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: controller.signal,
    });
  } catch (err: any) {
    const error = new Error(err?.message || 'Network error while making request.') as ApiError;
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const responseData = await response.json().catch(() => ({}));

  console.debug('[API] Response', {
    url: `${API_BASE_URL}${url}`,
    status: response.status,
    data: responseData,
  });

  if (!response.ok) {
    if (response.status === 401 && url !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = `${APP_BASE_URL}/login`;
    }

    const detail = typeof responseData.details === 'string' ? responseData.details : '';
    const message = [responseData.error || `Request failed with status ${response.status}`, detail]
      .filter(Boolean)
      .join(' ');
    const error = new Error(message) as ApiError;
    error.response = {
      status: response.status,
      data: responseData,
    };
    throw error;
  }

  return {
    config: {
      baseURL: API_BASE_URL,
      url,
    },
    status: response.status,
    data: responseData as T,
  };
};

export default {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, data: unknown) => request<T>('POST', url, data),
  put: <T>(url: string, data: unknown) => request<T>('PUT', url, data),
  delete: <T>(url: string) => request<T>('DELETE', url),
};
