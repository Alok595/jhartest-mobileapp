import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => {
  return authToken;
};

export const getApiBaseUrl = (): string => {
  // If explicitly overridden via environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Live deployed Vercel backend URL for production APK
  const PRODUCTION_BACKEND_URL = 'https://jhartestt.vercel.app/api';

  // If running on web
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
      }
      return `${window.location.origin}/api`;
    }
    return PRODUCTION_BACKEND_URL;
  }

  // If running in development with Expo Go (Physical device or emulator)
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:3000/api`;
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
  }

  // Production APK / Standalone build default
  return PRODUCTION_BACKEND_URL;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token dynamically to all outgoing requests
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl(); // dynamically refresh host in case network changes
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh TTL

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  // 1. Check ultra-fast RAM cache (< 1ms)
  const inMemory = memoryCache.get(key);
  if (inMemory && (Date.now() - inMemory.timestamp) < CACHE_TTL_MS) {
    return inMemory.data as T;
  }
  // 2. Check disk cache
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
      return parsed.data as T;
    }
  } catch (e) {
    // Ignore cache read errors
  }
  return null;
};

export const setCachedData = async (key: string, data: any) => {
  const payload = { data, timestamp: Date.now() };
  memoryCache.set(key, payload);
  try {
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(payload));
  } catch (e) {
    // Ignore cache write errors
  }
};

/* ================= API CALLS ================= */

// Categories (with instant cache + background revalidate)
export const getCategories = async () => {
  const cached = await getCachedData<any[]>('categories');
  
  // Background fetch
  const fetchPromise = apiClient.get('/categories?active=true')
    .then(res => {
      if (res.data) {
        setCachedData('categories', res.data);
      }
      return res.data;
    })
    .catch(error => {
      console.warn('Failed to fetch categories from server', error);
      return cached;
    });

  // If cached, return immediately for instant UI render
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return await fetchPromise;
};

// Test Series (with instant cache + background revalidate)
export const getTestSeries = async () => {
  const cached = await getCachedData<any[]>('test_series');
  
  // Background fetch
  const fetchPromise = apiClient.get('/test-series')
    .then(res => {
      if (res.data) {
        setCachedData('test_series', res.data);
      }
      return res.data;
    })
    .catch(error => {
      console.warn('Failed to fetch test series from server', error);
      return cached;
    });

  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return await fetchPromise;
};

// Single Test with Questions
export const getTestDetails = async (testId: string) => {
  const cached = await getCachedData<any>(`test_${testId}`);
  try {
    const res = await apiClient.get(`/tests/${testId}`);
    if (res.data) {
      setCachedData(`test_${testId}`, res.data);
    }
    return res.data;
  } catch (error) {
    if (cached) return cached;
    console.warn(`Failed to fetch test ${testId} from server`, error);
    return null;
  }
};

// Student Auth: Login or Register
export const loginOrRegister = async (payload: {
  identifier?: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  provider?: 'local' | 'google';
}) => {
  const res = await apiClient.post('/auth/login', payload);
  return res.data;
};

// Student Profile & Stats
export const getMyProfile = async () => {
  try {
    const res = await apiClient.get('/auth/me');
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch student profile', error);
    return null;
  }
};

// Submit Test Attempt
export const startAttempt = async (testId: string) => {
  try {
    const res = await apiClient.post('/attempts/start', { testId });
    return res.data;
  } catch (error) {
    console.warn('Failed to start attempt on server', error);
    return null;
  }
};

export const syncAttempt = async (attemptId: string, savedState: any) => {
  try {
    const res = await apiClient.patch(`/attempts/sync/${attemptId}`, savedState);
    return res.data;
  } catch (error) {
    console.warn('Failed to sync attempt on server', error);
    return null;
  }
};

export const submitAttempt = async (data: {
  testId: string;
  answers: { questionId: string; selectedOption: string }[];
  timeTaken: number;
}) => {
  try {
    const res = await apiClient.post('/attempts', data);
    return res.data;
  } catch (error) {
    console.warn('Failed to record attempt on server', error);
    return null;
  }
};

// Fetch User Attempts
export const fetchUserAttempts = async () => {
  try {
    const res = await apiClient.get('/attempts');
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch user attempts', error);
    return null;
  }
};

// Fetch Attempt Details
export const fetchAttemptDetails = async (attemptId: string) => {
  try {
    const res = await apiClient.get(`/attempts/${attemptId}`);
    return res.data;
  } catch (error) {
    console.warn(`Failed to fetch attempt details for ${attemptId}`, error);
    return null;
  }
};

// Fetch User Orders/Purchases
export const fetchMyOrders = async () => {
  try {
    const res = await apiClient.get('/orders/my-orders');
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch user orders', error);
    return null;
  }
};

/* ================= PREFETCH / PRE-DOWNLOAD ================= */

// Track which tests are already being prefetched to avoid duplicates
const prefetchingSet = new Set<string>();

/**
 * Silently pre-downloads test data (metadata + questions + attempt) in the background.
 * Call this when the user is browsing the series/test list page — BEFORE they tap "Start".
 * When they finally tap Start, the test screen loads from cache in <1 second.
 */
export const prefetchTestData = async (testId: string): Promise<void> => {
  if (!testId) return;

  // Don't prefetch the same test twice
  if (prefetchingSet.has(testId)) return;
  prefetchingSet.add(testId);

  try {
    // Check if already cached and fresh
    const cached = await getCachedData<any>(`test_start_${testId}`);
    if (cached && cached.questions && cached.questions.length > 0) {
      return; // Already have fresh data
    }

    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/tests/${testId}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ viewMode: 'exam' }),
    });

    if (res.ok) {
      const data = await res.json();
      await setCachedData(`test_start_${testId}`, data);
    }
  } catch (e) {
    // Silent — prefetch failures are not critical
  } finally {
    prefetchingSet.delete(testId);
  }
};

/**
 * Prefetch multiple tests in parallel (e.g. all tests in a series).
 * Limits concurrency to avoid flooding the network.
 */
export const prefetchMultipleTests = async (testIds: string[]): Promise<void> => {
  if (!testIds || testIds.length === 0) return;
  
  // Prefetch up to 3 at a time to avoid overwhelming the server
  const batchSize = 3;
  for (let i = 0; i < testIds.length; i += batchSize) {
    const batch = testIds.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(id => prefetchTestData(id)));
  }
};
