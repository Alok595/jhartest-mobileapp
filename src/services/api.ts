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
  // If running on web
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:3000/api`;
    }
    return 'http://localhost:3000/api';
  }

  // If running on Expo Go (Physical device or emulator)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000/api`;
  }

  // Fallback default for Android Emulator or Localhost
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
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

/* ================= API CALLS ================= */

// Categories
export const getCategories = async () => {
  try {
    const res = await apiClient.get('/categories?active=true');
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch categories from server, using fallback', error);
    return null;
  }
};

// Test Series
export const getTestSeries = async () => {
  try {
    const res = await apiClient.get('/test-series');
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch test series from server, using fallback', error);
    return null;
  }
};

// Single Test with Questions
export const getTestDetails = async (testId: string) => {
  try {
    const res = await apiClient.get(`/tests/${testId}`);
    return res.data;
  } catch (error) {
    console.warn(`Failed to fetch test ${testId} from server, using fallback`, error);
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

