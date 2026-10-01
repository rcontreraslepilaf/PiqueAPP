import type {
  Deal,
  Product,
  TokenPair,
  Trophy,
} from '../types/api';


export type OutdoorLocation = {
  locality: string;
  region: string | null;
  country: string;
  label: string;
  provider: string;
};

export type SeasonSummary = {
  category: 'pesca' | 'caza';
  species: string;
  scientific_name: string | null;
  status:
    | 'open'
    | 'closed'
    | 'protected'
    | 'regulated'
    | 'review';
  status_label: string;
  period: string;
  summary: string;
  authority: 'SERNAPESCA' | 'SAG';
  source_title: string;
  source_url: string;
};

export type OutdoorContext = {
  location: OutdoorLocation;
  seasons: SeasonSummary[];
  checked_at: string;
  notice: string;
};


export type CredentialRecord = {
  id: string;
  credential_type: string;
  title: string;
  authority: string;
  license_number: string | null;
  valid_from: string | null;
  expires_at: string | null;
  document_url: string | null;
  notes: string | null;
};

export type CredentialCreatePayload = {
  credential_type: string;
  title: string;
  authority: string;
  license_number?: string | null;
  valid_from?: string | null;
  expires_at?: string | null;
  document_url?: string | null;
  notes?: string | null;
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:8000/api/v1';

/* =========================================================
   FUNCIÓN BASE PARA LLAMAR A LA API
========================================================= */

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    init,
  );

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => null);

    throw new Error(
      payload?.detail ??
        `HTTP ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* =========================================================
   AUTENTICACIÓN
========================================================= */

export async function login(
  username: string,
  password: string,
): Promise<TokenPair> {
  const body = new URLSearchParams({
    username,
    password,
  });

  return request<TokenPair>(
    '/auth/login',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },

      body: body.toString(),
    },
  );
}

/* =========================================================
   REGISTRO DE USUARIO
========================================================= */

export type RegisterPayload = {
  email: string;
  username: string;
  password: string;
  display_name: string;
};

export type RegisterResponse = {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
};

export async function registerUser(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  return request<RegisterResponse>(
    '/auth/register',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify(payload),
    },
  );
}


/* =========================================================
   CREDENCIALES
========================================================= */

export function getCredentials(
  token: string,
): Promise<CredentialRecord[]> {
  return request<CredentialRecord[]>(
    '/credentials',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function createCredential(
  token: string,
  payload: CredentialCreatePayload,
): Promise<CredentialRecord> {
  return request<CredentialRecord>(
    '/credentials',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
}

export function deleteCredential(
  token: string,
  credentialId: string,
): Promise<void> {
  return request<void>(
    `/credentials/${credentialId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

/* =========================================================
   CATÁLOGO
========================================================= */

export function getProducts(
  q = '',
): Promise<Product[]> {
  const query = q
    ? `?q=${encodeURIComponent(q)}`
    : '';

  return request<Product[]>(
    `/catalog/products${query}`,
  );
}

/* =========================================================
   OFERTAS
========================================================= */

export function getDeals(): Promise<Deal[]> {
  return request<Deal[]>(
    '/deals',
  );
}

/* =========================================================
   TROFEOS
========================================================= */

export function getTrophies(
  token: string,
): Promise<Trophy[]> {
  return request<Trophy[]>(
    '/trophies',
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    },
  );
}

/* =========================================================
   CLIMA
========================================================= */

export function getWeather(
  latitude: number,
  longitude: number,
) {
  return request<
    Record<string, unknown>
  >(
    `/environment/weather/current` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}`,
  );
}

/* =========================================================
   CONTEXTO OUTDOOR / UBICACIÓN APROXIMADA / TEMPORADAS
========================================================= */


export function getOutdoorContext(
  latitude: number,
  longitude: number,
): Promise<OutdoorContext> {
  return request<OutdoorContext>(
    `/environment/context` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}`,
  );
}

/* =========================================================
   SOLUNAR
========================================================= */

export function getSolunar() {
  return request<
    Record<string, unknown>
  >(
    '/environment/solunar',
  );
}