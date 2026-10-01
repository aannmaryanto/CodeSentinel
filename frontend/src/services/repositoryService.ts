import { authService } from '@/services/authService';
import { RepositoryItem, SupportedLanguage } from '@/types/dashboard';

const API_URL = typeof window !== 'undefined' ? '' : (process.env.API_URL || '');

export interface BackendRepositoryResponse {
  id: string;
  organization_id: string;
  github_installation_id: string;
  github_repo_id: number;
  name: string;
  full_name: string;
  owner_handle: string;
  default_branch: string;
  is_private: boolean;
  is_archived: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function getAuthHeaders(): HeadersInit {
  const token = authService.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('[repositoryService] No Bearer token found in authService.getToken()');
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      console.error('[repositoryService] Failed to parse JSON response:', text);
      throw new Error(`Invalid JSON response from server (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    const detail = data.detail || data.error;
    const errorMessage = typeof detail === 'string'
      ? detail
      : `HTTP Error ${response.status}: Failed to process repository request.`;
    console.error(`[repositoryService] Request failed with HTTP ${response.status}:`, errorMessage);
    throw new Error(errorMessage);
  }

  return data as unknown as T;
}

function mapBackendRepoToItem(
  repo: BackendRepositoryResponse,
  languageOverride?: SupportedLanguage
): RepositoryItem {
  const inferredLanguage: SupportedLanguage = languageOverride || inferLanguageFromRepoName(repo.name);

  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner_handle,
    language: inferredLanguage,
    defaultBranch: repo.default_branch || 'main',
    isPrivate: repo.is_private,
    lastScan: formatRelativeTime(repo.updated_at),
    updatedAt: formatRelativeTime(repo.updated_at),
    openPRs: 0,
    healthScore: 100,
    vulnerabilityCount: 0,
    status: repo.is_active ? 'active' : 'paused',
    description: `Connected GitHub repository ${repo.full_name}`,
  };
}

function inferLanguageFromRepoName(name: string): SupportedLanguage {
  const lower = name.toLowerCase();
  if (lower.includes('py') || lower.includes('python') || lower.includes('api')) return 'python';
  if (lower.includes('go')) return 'go';
  if (lower.includes('cpp') || lower.includes('c++')) return 'cpp';
  if (lower.includes('java')) return 'java';
  if (lower.includes('js') || lower.includes('javascript')) return 'javascript';
  return 'typescript';
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

export const repositoryService = {
  // GET /api/v1/repositories
  async getRepositories(): Promise<RepositoryItem[]> {
    console.log('[repositoryService.getRepositories] Fetching GET /api/v1/repositories');
    const response = await fetch(`${API_URL}/api/v1/repositories`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    console.log('[repositoryService.getRepositories] Response status:', response.status);
    const data = await handleResponse<BackendRepositoryResponse[]>(response);
    return data.map((repo) => mapBackendRepoToItem(repo));
  },

  // POST /api/v1/repositories
  async connectRepository(
    fullName: string,
    language: SupportedLanguage = 'typescript',
    isPrivate: boolean = true
  ): Promise<RepositoryItem> {
    const trimmed = fullName.trim();
    if (!trimmed) {
      throw new Error('Repository name cannot be empty.');
    }

    console.log('[repositoryService.connectRepository] Fetching POST /api/v1/repositories with:', trimmed);
    const response = await fetch(`${API_URL}/api/v1/repositories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        full_name: trimmed,
        default_branch: 'main',
        is_private: isPrivate,
      }),
    });

    console.log('[repositoryService.connectRepository] Response status:', response.status);
    const data = await handleResponse<BackendRepositoryResponse>(response);
    return mapBackendRepoToItem(data, language);
  },

  // GET /api/v1/repositories/{repository_id}
  async getRepositoryDetails(repositoryId: string): Promise<RepositoryItem> {
    console.log(`[repositoryService.getRepositoryDetails] Fetching GET /api/v1/repositories/${repositoryId}`);
    const response = await fetch(`${API_URL}/api/v1/repositories/${repositoryId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    console.log('[repositoryService.getRepositoryDetails] Response status:', response.status);
    const data = await handleResponse<BackendRepositoryResponse>(response);
    return mapBackendRepoToItem(data);
  },

  // POST /api/v1/repositories/{repository_id}/sync
  async syncRepository(repositoryId: string): Promise<RepositoryItem> {
    console.log(`[repositoryService.syncRepository] Fetching POST /api/v1/repositories/${repositoryId}/sync`);
    const response = await fetch(`${API_URL}/api/v1/repositories/${repositoryId}/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    console.log('[repositoryService.syncRepository] Response status:', response.status);
    const data = await handleResponse<BackendRepositoryResponse>(response);
    return mapBackendRepoToItem(data);
  },

  // POST /api/v1/repositories/{repository_id}/scan
  async scanRepository(repositoryId: string): Promise<RepositoryItem> {
    console.log(`[repositoryService.scanRepository] Fetching POST /api/v1/repositories/${repositoryId}/scan`);
    const response = await fetch(`${API_URL}/api/v1/repositories/${repositoryId}/scan`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    console.log('[repositoryService.scanRepository] Response status:', response.status);
    const data = await handleResponse<BackendRepositoryResponse>(response);
    return mapBackendRepoToItem(data);
  },
};
