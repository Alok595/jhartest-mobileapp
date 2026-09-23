import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../lib/supabase';
import { setAuthToken, getMyProfile } from '../services/api';

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
  accuracy: string;
  stateRank: string;
}

interface AuthContextType {
  user: UserProfile | null;
  stats: StudentStats | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: { name: string; email: string; phone?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: any) => {
    if (session?.access_token) {
      setToken(session.access_token);
      setAuthToken(session.access_token);

      // 1. Instantly populate user from Supabase session (0ms UI reflect!)
      if (session.user) {
        const metadata = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          name: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Student',
          email: session.user.email,
          phone: session.user.phone || metadata.phone,
          avatar: metadata.avatar_url,
          role: metadata.role || 'STUDENT',
        });
        setIsLoading(false);
      }

      // 2. Fetch fresh backend profile & stats in background
      await refreshProfile();
    } else {
      setToken(null);
      setUser(null);
      setStats(null);
      setAuthToken(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const profileRes = await getMyProfile();
      if (profileRes && profileRes.user) {
        setUser(profileRes.user);
        setStats(profileRes.stats);
      }
    } catch (e) {
      console.warn('Failed to refresh profile', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password?: string) => {
    if (!email.trim()) return { success: false, error: 'Email is required' };
    if (!password) return { success: false, error: 'Password is required' };

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
             // In case PKCE flow returned a code
             await supabase.auth.exchangeCodeForSession(params.code);
          }
          
          // Explicitly await the session to be fully loaded and profile fetched
          // so the user doesn't see a delay in the UI after redirecting
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
    if (!data.email?.trim()) return { success: false, error: 'Email is required' };
    if (!data.password) return { success: false, error: 'Password is required' };

    try {
      setIsLoading(true);
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            name: data.name,
            phone: data.phone || '',
          },
        },
      });

      if (error) throw error;

      if (signUpData?.session) {
        await handleSession(signUpData.session);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setStats(null);
    setAuthToken(null);
    try {
      await supabase.auth.signOut();
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
