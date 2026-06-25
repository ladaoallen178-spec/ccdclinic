// Prefer an explicit VITE_API_URL for backend calls.
// If not set, use localhost in dev and the current origin in production.
const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const API_BASE_URLS = apiUrl
  ? [apiUrl]
  : import.meta.env.DEV
  ? ['http://localhost:8001']
  : [typeof window !== 'undefined' ? window.location.origin : ''];
const APP_BASE_URL = import.meta.env.VITE_BASE ?? '';
const REQUEST_TIMEOUT_MS = 30000;

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

  let response: Response | undefined;
  let baseURL = API_BASE_URLS[0];
  let lastNetworkError: unknown;

  for (let index = 0; index < API_BASE_URLS.length; index += 1) {
    baseURL = API_BASE_URLS[index];
    console.debug('[API] Request', {
      method,
      url: `${baseURL}${url}`,
      data: maskPassword(data),
      headers: loggedHeaders,
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await fetch(`${baseURL}${url}`, {
        method,
        headers,
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: controller.signal,
      });

      if ((response.status === 404 || response.status === 405) && index < API_BASE_URLS.length - 1) {
        continue;
      }

      break;
    } catch (err) {
      lastNetworkError = err;
      if (index === API_BASE_URLS.length - 1) {
        const message = err instanceof Error ? err.message : 'Network error while making request.';
        throw new Error(message) as ApiError;
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (!response) {
    const message = lastNetworkError instanceof Error ? lastNetworkError.message : 'Network error while making request.';
    throw new Error(message) as ApiError;
  }

  const responseData = await response.json().catch(() => ({}));

  console.debug('[API] Response', {
    url: `${baseURL}${url}`,
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
      baseURL,
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
