import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { setAuthToken, getMyProfile, apiClient } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: string;
}

export interface StudentStats {
  testsAttempted: number;
  seriesEnrolled: number;
  questionsSolved: number;
}

interface AuthContextType {
  user: UserProfile | null;
  stats: StudentStats | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  directLoginOrSendOtp: (data: { email?: string; phone?: string; identifier?: string; name?: string }) => Promise<{ success: boolean; isNewUser?: boolean; message?: string; error?: string }>;
  verifyLoginOtp: (data: { email: string; otp: string; name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: { name: string; email: string; phone?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const STORAGE_TOKEN_KEY = 'jhartest_persisted_token';
const STORAGE_USER_KEY = 'jhartest_persisted_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initial boot: check persistent local storage first (instant 0ms offline-ready login!)
    const initAuth = async () => {
      try {
        const [savedToken, savedUserJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TOKEN_KEY),
          AsyncStorage.getItem(STORAGE_USER_KEY),
        ]);

        if (savedToken) {
          setToken(savedToken);
          setAuthToken(savedToken);
          if (savedUserJson) {
            try {
              setUser(JSON.parse(savedUserJson));
            } catch {}
          }
          setIsLoading(false);
          // Refresh fresh profile in background
          refreshProfile();
          return;
        }

        // 2. Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await handleSession(session);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const savePersistedSession = async (userToken: string, userObj: any) => {
    setToken(userToken);
    setAuthToken(userToken);
    setUser(userObj);
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_TOKEN_KEY, userToken),
        AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj)),
      ]);
    } catch (e) {
      console.warn('Failed to save session locally', e);
    }
  };

  const handleSession = async (session: any) => {
    if (session?.access_token) {
      const metadata = session.user?.user_metadata || {};
      const userProfile: UserProfile = {
        id: session.user.id,
        name: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Student',
        email: session.user.email,
        phone: session.user.phone || metadata.phone,
        avatar: metadata.avatar_url,
        role: metadata.role || 'STUDENT',
      };

      await savePersistedSession(session.access_token, userProfile);
      setIsLoading(false);

      // Fetch fresh backend profile & stats in background
      await refreshProfile();
    } else {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const profileRes = await getMyProfile();
      if (profileRes && profileRes.user) {
        setUser(profileRes.user);
        setStats(profileRes.stats);
        AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profileRes.user)).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to refresh profile', e);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Passwordless Direct Login (existing student) or Trigger Email OTP (new student)
   */
  const directLoginOrSendOtp = async (data: { email?: string; phone?: string; identifier?: string; name?: string }) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/auth/login', {
        identifier: data.identifier?.trim(),
        email: data.email?.trim(),
        phone: data.phone?.trim(),
        name: data.name?.trim(),
      });

      if (res.data?.success) {
        // Direct instant login (existing or auto-created user)
        if (res.data.token) {
          await savePersistedSession(res.data.token, res.data.user);
          return { success: true, isNewUser: false };
        }

        if (res.data.isNewUser === true) {
          return { success: true, isNewUser: true, message: res.data.message };
        }
      }

      return { success: false, error: res.data?.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || err.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify Login OTP & Auto-Create Account
   */
  const verifyLoginOtp = async (data: { email: string; otp: string; name?: string; phone?: string }) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/auth/verify-login-otp', {
        email: data.email.trim(),
        otp: data.otp.trim(),
        name: data.name?.trim(),
        phone: data.phone?.trim(),
      });

      if (res.data?.success && res.data?.token) {
        await savePersistedSession(res.data.token, res.data.user);
        return { success: true };
      }

      return { success: false, error: res.data?.error || 'Invalid OTP' };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || err.message || 'OTP verification failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password?: string) => {
    if (!email.trim()) return { success: false, error: 'Email is required' };
    if (!password) {
      return directLoginOrSendOtp({ identifier: email });
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (data?.session) {
        await handleSession(data.session);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = makeRedirectUri({
        scheme: 'jhartestapp',
        path: 'auth/callback',
      });
      console.log("EXPO REDIRECT URL GENERATED:", redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const { params, errorCode } = QueryParams.getQueryParams(result.url);
          
          if (errorCode) throw new Error(errorCode);
          
          if (params.access_token) {
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token || '',
            });
          } else if (params.code) {
             await supabase.auth.exchangeCodeForSession(params.code);
          }
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await handleSession(session);
          }
        } else if (result.type === 'cancel') {
           return { success: false, error: 'Authentication was cancelled' };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Google authentication error' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: { name: string; email: string; phone?: string; password?: string }) => {
    return directLoginOrSendOtp({ identifier: data.email, name: data.name, phone: data.phone });
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setStats(null);
    setAuthToken(null);
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_TOKEN_KEY),
        AsyncStorage.removeItem(STORAGE_USER_KEY),
        supabase.auth.signOut(),
      ]);
    } catch (e) {
      console.warn('Logout error', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        token,
        isLoading,
        login,
        directLoginOrSendOtp,
        verifyLoginOtp,
        loginWithGoogle,
        registerUser,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
