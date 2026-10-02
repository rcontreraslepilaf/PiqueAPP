import type {
  Deal,
  FeedItem,
  LikeState,
  Product,
  ProfileSummary,
  ProfileUpdatePayload,
  Spot,
  SpotCreatePayload,
  TokenPair,
  Trophy,
  TrophyComment,
  TrophyCreatePayload,
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

export type ImageUpload = {
  uri: string;
  fileName: string;
  mimeType: string;
  webFile?: Blob | null;
};

export type CredentialImageUpload = ImageUpload;

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:8000/api/v1';

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

async function authenticatedBlobDataUrl(
  path: string,
  token: string,
): Promise<string> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
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

  const blob = await response.blob();

  return new Promise<string>(
    (resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result ===
          'string'
        ) {
          resolve(reader.result);
          return;
        }

        reject(
          new Error(
            'No se pudo leer la imagen.',
          ),
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            'No se pudo leer la imagen.',
          ),
        );
      };

      reader.readAsDataURL(blob);
    },
  );
}

function appendImage(
  formData: FormData,
  image: ImageUpload,
) {
  if (image.webFile) {
    formData.append(
      'file',
      image.webFile,
      image.fileName,
    );
    return;
  }

  formData.append(
    'file',
    {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    } as unknown as Blob,
  );
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

export async function uploadCredentialImage(
  token: string,
  credentialId: string,
  image: CredentialImageUpload,
): Promise<CredentialRecord> {
  const formData = new FormData();
  appendImage(formData, image);

  return request<CredentialRecord>(
    `/credentials/${credentialId}/document`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );
}

export function getCredentialImageDataUrl(
  token: string,
  credentialId: string,
): Promise<string> {
  return authenticatedBlobDataUrl(
    `/credentials/${credentialId}/document`,
    token,
  );
}

export function deleteCredentialImage(
  token: string,
  credentialId: string,
): Promise<void> {
  return request<void>(
    `/credentials/${credentialId}/document`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

/* =========================================================
   CAPTURAS / TROFEOS
========================================================= */

export function getTrophies(
  token: string,
  mine = false,
): Promise<Trophy[]> {
  return request<Trophy[]>(
    `/trophies?mine=${mine ? 'true' : 'false'}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function createTrophy(
  token: string,
  payload: TrophyCreatePayload,
): Promise<Trophy> {
  return request<Trophy>(
    '/trophies',
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

export async function uploadTrophyImage(
  token: string,
  trophyId: string,
  image: ImageUpload,
): Promise<{ status: string; has_image: boolean }> {
  const formData = new FormData();
  appendImage(formData, image);

  return request<{ status: string; has_image: boolean }>(
    `/trophies/${trophyId}/image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );
}

export function getTrophyImageDataUrl(
  token: string,
  trophyId: string,
): Promise<string> {
  return authenticatedBlobDataUrl(
    `/trophies/${trophyId}/image`,
    token,
  );
}

export function deleteTrophy(
  token: string,
  trophyId: string,
): Promise<void> {
  return request<void>(
    `/trophies/${trophyId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

/* =========================================================
   MURO SOCIAL
========================================================= */

export function getFeed(
  token: string,
  mine = false,
): Promise<FeedItem[]> {
  return request<FeedItem[]>(
    `/social/feed?mine=${mine ? 'true' : 'false'}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function toggleTrophyLike(
  token: string,
  trophyId: string,
): Promise<LikeState> {
  return request<LikeState>(
    `/social/trophies/${trophyId}/like`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function getTrophyComments(
  token: string,
  trophyId: string,
): Promise<TrophyComment[]> {
  return request<TrophyComment[]>(
    `/social/trophies/${trophyId}/comments`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function addTrophyComment(
  token: string,
  trophyId: string,
  body: string,
): Promise<TrophyComment> {
  return request<TrophyComment>(
    `/social/trophies/${trophyId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body }),
    },
  );
}

/* =========================================================
   SPOTS / MAPA
========================================================= */

export function getSpots(
  token: string,
  mine = false,
): Promise<Spot[]> {
  return request<Spot[]>(
    `/spots?mine=${mine ? 'true' : 'false'}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function createSpot(
  token: string,
  payload: SpotCreatePayload,
): Promise<Spot> {
  return request<Spot>(
    '/spots',
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

export function deleteSpot(
  token: string,
  spotId: string,
): Promise<void> {
  return request<void>(
    `/spots/${spotId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

/* =========================================================
   PERFIL
========================================================= */

export function getMyProfile(
  token: string,
): Promise<ProfileSummary> {
  return request<ProfileSummary>(
    '/profile/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function updateMyProfile(
  token: string,
  payload: ProfileUpdatePayload,
): Promise<ProfileSummary> {
  return request<ProfileSummary>(
    '/profile/me',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function uploadProfileAvatar(
  token: string,
  image: ImageUpload,
): Promise<ProfileSummary> {
  const formData = new FormData();
  appendImage(formData, image);

  return request<ProfileSummary>(
    '/profile/avatar',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );
}

export function getProfileAvatarDataUrl(
  token: string,
): Promise<string> {
  return authenticatedBlobDataUrl(
    '/profile/avatar',
    token,
  );
}

/* =========================================================
   CATÁLOGO / OFERTAS
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

export function getDeals(): Promise<Deal[]> {
  return request<Deal[]>('/deals');
}

/* =========================================================
   CLIMA / CONTEXTO / SOLUNAR
========================================================= */

export function getWeather(
  latitude: number,
  longitude: number,
) {
  return request<Record<string, unknown>>(
    `/environment/weather/current` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}`,
  );
}

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

export function getSolunar() {
  return request<Record<string, unknown>>(
    '/environment/solunar',
  );
}
