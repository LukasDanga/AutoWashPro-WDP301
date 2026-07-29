/**
 * AutoWashPro Auth Context
 * Authentication state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { authApi } from '../api/auth';
import { setAccessTokenCache, clearAccessTokenCache } from '../api/client';
import type { User, RegisterRequest } from '../types';

// Storage keys
const ACCESS_TOKEN_KEY = 'aw_accessToken';
const REFRESH_TOKEN_KEY = 'aw_refreshToken';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { sseService } from '../services/sse';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
  });

  const fetchUser = useCallback(async () => {
    try {
      const user = await authApi.getProfile();
      setState((prev) => ({ ...prev, user }));
    } catch (error) {
      console.warn('Failed to fetch user:', error);
    }
  }, []);

  // Listen to SSE events for real-time profile updates
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      const unsubTopup = sseService.subscribe('wallet_topup_success', fetchUser);
      const unsubSpin = sseService.subscribe('spin_added', fetchUser);
      const unsubSlot = sseService.subscribe('slot_pack_paid', fetchUser);

      return () => {
        unsubTopup();
        unsubSpin();
        unsubSlot();
      };
    }
  }, [state.isAuthenticated, state.user, fetchUser]);

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

        if (accessToken) {
          setAccessTokenCache(accessToken);
          // Try to get user profile
          try {
            const user = await authApi.getProfile();
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } catch (error) {
            // Token might be expired, try refresh
            if (refreshToken) {
              const refreshed = await refreshTokens();
              if (!refreshed) {
                await clearTokens();
                setState((prev) => ({ ...prev, isInitialized: true }));
              }
            } else {
              await clearTokens();
              setState((prev) => ({ ...prev, isInitialized: true }));
            }
          }
        } else {
          setState((prev) => ({ ...prev, isInitialized: true }));
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setState((prev) => ({ ...prev, isInitialized: true }));
      }
    };

    initAuth();
  }, []);

  const clearTokens = async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    clearAccessTokenCache();
  };

  const storeTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    setAccessTokenCache(accessToken);
  };

  const login = useCallback(async (identifier: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await authApi.login(identifier, password);
      const { accessToken, refreshToken, user } = result;

      await storeTokens(accessToken, refreshToken);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      router.replace('/(tabs)');
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await authApi.loginWithGoogle(idToken);
      const { accessToken, refreshToken, user } = result;

      await storeTokens(accessToken, refreshToken);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      router.replace('/(tabs)');
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await authApi.register(data);
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout API errors
      console.error('Logout API error:', error);
    } finally {
      await clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      router.replace('/(auth)/login');
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const user = await authApi.updateCustomerProfile(data);
      setState((prev) => ({
        ...prev,
        user,
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const result = await authApi.refreshToken(refreshToken);
      const { accessToken, refreshToken: newRefreshToken } = result;

      await storeTokens(accessToken, newRefreshToken);

      // Fetch user profile
      const user = await authApi.getProfile();
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      return true;
    } catch (error: any) {
      console.warn('Token refresh error:', error.message || error);
      return false;
    }
  }, []);

  const value: AuthContextType = React.useMemo(() => ({
    ...state,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    refreshTokens,
    fetchUser,
  }), [state, login, loginWithGoogle, register, logout, updateProfile, refreshTokens, fetchUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
