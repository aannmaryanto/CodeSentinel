'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  User,
  UserLoginRequest,
  UserRegisterRequest,
  AuthContextType,
} from '@/types/auth';
import { authService } from '@/services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Validate initial token and sync session state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authService.getToken();
      const cachedUser = authService.getCachedUser();

      if (storedToken) {
        setToken(storedToken);
        if (cachedUser) {
          setUser(cachedUser);
        }

        try {
          const freshUser = await authService.getCurrentUser(storedToken);
          setUser(freshUser);
        } catch {
          // Token invalid or expired
          authService.clearAuth();
          setToken(null);
          setUser(null);
          if (!PUBLIC_ROUTES.includes(pathname)) {
            router.push('/login');
          }
        }
      } else {
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [pathname, router]);

  const login = useCallback(
    async (credentials: UserLoginRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.login(credentials);
        setToken(response.access_token);
        setUser(response.user);
        router.push('/');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (userData: UserRegisterRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.register(userData);
        setToken(response.access_token);
        setUser(response.user);
        router.push('/');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    authService.clearAuth();
    setToken(null);
    setUser(null);
    setError(null);
    router.push('/login');
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
