let globalBaseUrl = '/api/v1/hiring';
let globalTokenGetter: (() => string | null) | null = null;
let globalUnauthorizedHandler: (() => void) | null = null;

export function configureHttp({
  baseUrl,
  getToken,
  onUnauthorized,
}: {
  baseUrl?: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}) {
  if (baseUrl) globalBaseUrl = baseUrl.replace(/\/+$/, '');
  if (getToken) globalTokenGetter = getToken;
  if (onUnauthorized) globalUnauthorizedHandler = onUnauthorized;
}

function resolveToken(): string | null {
  if (globalTokenGetter) {
    const t = globalTokenGetter();
    if (t) return t;
  }
  return localStorage.getItem('roadexpress_hiring_token');
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${globalBaseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  const token = resolveToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof globalUnauthorizedHandler === 'function') {
      globalUnauthorizedHandler();
    }
  }

  if (response.headers.get('content-type')?.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  let jsonResult: any = null;
  try {
    jsonResult = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    return {} as T;
  }

  if (!response.ok) {
    const errorMsg =
      jsonResult?.error?.message ||
      jsonResult?.message ||
      jsonResult?.detail ||
      `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).details = jsonResult?.error?.details || null;
    throw err;
  }

  return (jsonResult.data !== undefined ? jsonResult.data : jsonResult) as T;
}

export const http = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          search.append(k, String(v));
        }
      });
      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  patch: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body || {}),
    });
  },

  delete: <T>(endpoint: string) => {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
