import type {
  BranchEligibleAlert,
  CareerPath,
  DependencyReport,
  Expertise,
  PaymentInitiateResponse,
  PaymentStatusResponse,
  PrecedentRow,
  PyramidEntry,
  StagnationAlert,
  TitleResolveResponse,
  AuthResponse,
  UserProfile,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_BASE_URL;
const TOKEN_KEY = 'cassor_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetchJson<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(response.token);
  return response;
}

export async function register(payload: {
  username: string;
  password: string;
  display_name?: string;
  employee_code?: string;
}): Promise<AuthResponse> {
  const response = await fetchJson<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(response.token);
  return response;
}

export async function getProfile(): Promise<UserProfile> {
  return fetchJson<UserProfile>('/api/v1/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await fetchJson<{ status: string }>('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
}

export async function getExpertises(params?: {
  segment?: string;
  enabledOnly?: boolean;
}): Promise<Expertise[]> {
  const search = new URLSearchParams();
  if (params?.segment) search.set('segment', params.segment);
  if (params?.enabledOnly) search.set('enabled_only', 'true');
  const query = search.toString();
  return fetchJson<Expertise[]>(`/api/v1/explore/expertises${query ? `?${query}` : ''}`);
}

export async function getCareerPath(expertiseCode: string): Promise<CareerPath> {
  const raw = await fetchJson<CareerPath & { edges: { from: string; to: string; type: string; label?: string }[] }>(
    `/api/v1/explore/career-path/${encodeURIComponent(expertiseCode)}`
  );

  return {
    ...raw,
    edges: raw.edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      type: edge.type as CareerPath['edges'][number]['type'],
      label: edge.label,
    })),
  };
}

export async function updateTitle(
  id: number,
  payload: { desc?: string; general_requirement?: string; exp_requirement?: string }
): Promise<{ status: string }> {
  return fetchJson<{ status: string }>(`/api/v1/explore/titles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function resolveTitle(rawTitle: string): Promise<TitleResolveResponse> {
  return fetchJson<TitleResolveResponse>('/api/v1/me/resolve-title', {
    method: 'POST',
    body: JSON.stringify({ raw_title: rawTitle }),
  });
}

export async function getMyCareerPath(): Promise<CareerPath> {
  const raw = await fetchJson<
    Omit<CareerPath, 'currentNodeId'> & { current_node_id?: string | null }
  >('/api/v1/me/path');

  return {
    ...raw,
    currentNodeId: raw.current_node_id ?? undefined,
  };
}

export async function getPrecedents(): Promise<PrecedentRow[]> {
  return fetchJson<PrecedentRow[]>('/api/v1/me/precedents');
}

export async function getPyramid(expertiseGroup?: string): Promise<PyramidEntry[]> {
  const search = new URLSearchParams();
  if (expertiseGroup) search.set('expertise_group', expertiseGroup);
  const query = search.toString();
  return fetchJson<PyramidEntry[]>(`/api/v1/radar/pyramid${query ? `?${query}` : ''}`);
}

export async function getBranchEligibleAlerts(): Promise<BranchEligibleAlert[]> {
  return fetchJson<BranchEligibleAlert[]>('/api/v1/radar/alerts/branch-eligible');
}

export async function getStagnationAlerts(): Promise<StagnationAlert[]> {
  return fetchJson<StagnationAlert[]>('/api/v1/radar/alerts/stagnation');
}

export async function getDependencyReports(): Promise<DependencyReport[]> {
  return fetchJson<DependencyReport[]>('/api/v1/radar/dependency');
}

// ── Payment API ──────────────────────────────────────────────────────────────

export async function initiatePayment(file: File): Promise<PaymentInitiateResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE_URL.replace(/\/$/, '')}/api/v1/payment/initiate`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    // No Content-Type header — browser sets multipart boundary automatically
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload thất bại: ${response.status}`);
  }

  return (await response.json()) as PaymentInitiateResponse;
}

export async function getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
  return fetchJson<PaymentStatusResponse>(`/api/v1/payment/status/${encodeURIComponent(reference)}`);
}

export async function downloadAnalysisReport(reference: string): Promise<Blob> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/api/v1/payment/analyze/${encodeURIComponent(reference)}`;
  const response = await fetch(url, { method: 'POST' });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Tải báo cáo thất bại: ${response.status}`);
  }

  return response.blob();
}
