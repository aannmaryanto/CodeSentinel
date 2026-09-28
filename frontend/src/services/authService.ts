import {
  User,
  UserLoginRequest,
  UserRegisterRequest,
  TokenResponse,
} from '@/types/auth';

// Use relative paths in the browser client to route through Next.js server API proxy
const API_URL = typeof window !== 'undefined' ? '' : (process.env.API_URL || '');
const TOKEN_KEY = 'codesentinel_token';
const USER_KEY = 'codesentinel_user';

export const authService = {
  // Save authentication token to localStorage and cookie for Next.js Middleware
  setAuth(token: string, user: User) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      // Store in cookie for Next.js edge middleware protection (7 days expiry)
      document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
  },

  // Clear authentication token and user data
  clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  },

  // Get token from localStorage
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  // Get cached user from localStorage
  getCachedUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr) as User;
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  // Login request
  async login(credentials: UserLoginRequest): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        data.detail || data.error || `Failed to sign in (HTTP ${response.status}). Please check your credentials.`;
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    const tokenResponse = data as unknown as TokenResponse;
    this.setAuth(tokenResponse.access_token, tokenResponse.user);
    return tokenResponse;
  },

  // Registration request
  async register(userData: UserRegisterRequest): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        data.detail || data.error || `Registration failed (HTTP ${response.status}). Please try again.`;
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    const tokenResponse = data as unknown as TokenResponse;
    this.setAuth(tokenResponse.access_token, tokenResponse.user);
    return tokenResponse;
  },

  // Get current user profile using JWT token
  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        data.detail || data.error || `Session expired (HTTP ${response.status}). Please log in again.`;
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(data));
    }

    return data as unknown as User;
  },
};

async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${text.slice(0, 150)}`);
    }
    throw new Error(`Invalid JSON response from server (HTTP ${response.status})`);
  }
}
