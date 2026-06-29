// Prefer an explicit VITE_API_URL for backend calls.
// If not set:
// - In DEV: use http://localhost:8000 (backend default port)
// - In PROD: use the VITE_BACKEND_URL or fail with clear message
const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? '').trim();

let API_BASE_URLS: string[];

if (apiUrl) {
  // Explicit VITE_API_URL takes precedence
  API_BASE_URLS = [apiUrl];
} else if (import.meta.env.DEV) {
  // Development mode: use localhost backend
  API_BASE_URLS = ['http://localhost:8000'];
} else if (backendUrl) {
  // Production: use explicit backend URL if provided
  API_BASE_URLS = [backendUrl];
} else {
  // Fallback: This should not happen in production
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  console.warn(
    '[API] No VITE_API_URL or VITE_BACKEND_URL set. Falling back to current origin.',
    'This will fail if frontend and backend are on different domains.',
    { origin }
  );
  API_BASE_URLS = origin ? [origin] : [];
}

const APP_BASE_URL = import.meta.env.VITE_BASE ?? '';
const REQUEST_TIMEOUT_MS = 30000;

console.log('[API] Configuration', {
  isDev: import.meta.env.DEV,
  apiUrl,
  backendUrl,
  baseUrls: API_BASE_URLS,
});


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
