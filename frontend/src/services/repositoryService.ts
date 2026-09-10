import { RepositoryItem, SupportedLanguage } from '@/types/dashboard';

const STORAGE_KEY = 'codesentinel_repositories';

const INITIAL_REPOSITORIES: RepositoryItem[] = [
  {
    id: 'repo-1',
    name: 'CodeSentinel',
    fullName: 'aannmaryanto/CodeSentinel',
    owner: 'aannmaryanto',
    language: 'typescript',
    defaultBranch: 'main',
    isPrivate: true,
    lastScan: '10 mins ago',
    updatedAt: '2 hours ago',
    openPRs: 2,
    healthScore: 98,
    vulnerabilityCount: 0,
    status: 'active',
    description: 'AI-powered code review and security analysis platform',
  },
  {
    id: 'repo-2',
    name: 'codesentinel-api',
    fullName: 'aannmaryanto/codesentinel-api',
    owner: 'aannmaryanto',
    language: 'python',
    defaultBranch: 'main',
    isPrivate: true,
    lastScan: '2 hours ago',
    updatedAt: '1 day ago',
    openPRs: 4,
    healthScore: 84,
    vulnerabilityCount: 2,
    status: 'active',
    description: 'FastAPI python core backend for static and AI scanning services',
  },
  {
    id: 'repo-3',
    name: 'web-dashboard',
    fullName: 'aannmaryanto/web-dashboard',
    owner: 'aannmaryanto',
    language: 'javascript',
    defaultBranch: 'main',
    isPrivate: false,
    lastScan: '1 day ago',
    updatedAt: '3 days ago',
    openPRs: 1,
    healthScore: 92,
    vulnerabilityCount: 1,
    status: 'active',
    description: 'Frontend Next.js user interface web application',
  },
  {
    id: 'repo-4',
    name: 'auth-microservice',
    fullName: 'aannmaryanto/auth-microservice',
    owner: 'aannmaryanto',
    language: 'go',
    defaultBranch: 'main',
    isPrivate: true,
    lastScan: '3 days ago',
    updatedAt: '4 days ago',
    openPRs: 0,
    healthScore: 78,
    vulnerabilityCount: 3,
    status: 'active',
    description: 'Go authentication and JWT identity verification service',
  },
  {
    id: 'repo-5',
    name: 'secure-crypto-module',
    fullName: 'aannmaryanto/secure-crypto-module',
    owner: 'aannmaryanto',
    language: 'cpp',
    defaultBranch: 'main',
    isPrivate: true,
    lastScan: '5 days ago',
    updatedAt: '1 week ago',
    openPRs: 0,
    healthScore: 88,
    vulnerabilityCount: 1,
    status: 'active',
    description: 'C++ low-level cryptographic primitives and buffer validators',
  },
];

export const repositoryService = {
  // Fetch all repositories with simulated async latency
  async getRepositories(): Promise<RepositoryItem[]> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored) as RepositoryItem[];
        } catch {
          // Fall back to initial list if parse fails
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REPOSITORIES));
    }
    return INITIAL_REPOSITORIES;
  },

  // Connect a new GitHub repository
  async connectRepository(
    fullName: string,
    language: SupportedLanguage = 'typescript',
    isPrivate: boolean = true
  ): Promise<RepositoryItem> {
    const trimmed = fullName.trim();
    if (!trimmed) {
      throw new Error('Repository name cannot be empty.');
    }

    const nameParts = trimmed.split('/');
    const owner = nameParts.length > 1 ? nameParts[0] : 'aannmaryanto';
    const repoName = nameParts.length > 1 ? nameParts[1] : trimmed;
    const formattedFullName = `${owner}/${repoName}`;

    const currentRepos = await this.getRepositories();
    const duplicate = currentRepos.find(
      (r) => r.fullName.toLowerCase() === formattedFullName.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`Repository '${formattedFullName}' is already connected.`);
    }

    const newRepo: RepositoryItem = {
      id: `repo-${Date.now()}`,
      name: repoName,
      fullName: formattedFullName,
      owner,
      language,
      defaultBranch: 'main',
      isPrivate,
      lastScan: 'Just now',
      updatedAt: 'Just now',
      openPRs: 0,
      healthScore: 100,
      vulnerabilityCount: 0,
      status: 'active',
      description: `GitHub repository ${formattedFullName} connected for AI security reviews`,
    };

    const updatedList = [newRepo, ...currentRepos];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }

    return newRepo;
  },

  // Manual sync repository status
  async syncRepository(repoId: string): Promise<RepositoryItem> {
    const repos = await this.getRepositories();
    const repoIndex = repos.findIndex((r) => r.id === repoId);

    if (repoIndex === -1) {
      throw new Error('Repository not found.');
    }

    const updatedRepo: RepositoryItem = {
      ...repos[repoIndex],
      lastScan: 'Just now',
      updatedAt: 'Just now',
      status: 'active',
    };

    repos[repoIndex] = updatedRepo;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repos));
    }

    return updatedRepo;
  },
};
