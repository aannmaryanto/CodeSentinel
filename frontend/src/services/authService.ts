import {
  User,
  UserLoginRequest,
  UserRegisterRequest,
  TokenResponse,
} from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.detail || data.error || 'Failed to sign in. Please check your credentials.';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    this.setAuth(data.access_token, data.user);
    return data as TokenResponse;
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

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.detail || data.error || 'Registration failed. Please try again.';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    this.setAuth(data.access_token, data.user);
    return data as TokenResponse;
  },

  // Get current user profile using JWT token
  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Session expired. Please log in again.');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(data));
    }

    return data as User;
  },
};
