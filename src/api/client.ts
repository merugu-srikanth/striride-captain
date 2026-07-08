import axios, { AxiosError } from 'axios';
import { DEFAULT_ERROR_MESSAGE, ERROR_MESSAGES } from '../constants/errors';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://192.168.1.30:5001/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🌐 [Captain API] ${config.method?.toUpperCase()} ${config.url}`, config.data ?? '');
    return config;
  },
  (error) => {
    console.error('🌐 [Captain API] Request error:', error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [Captain API] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error: AxiosError) => {
    let message = DEFAULT_ERROR_MESSAGE;
    if (error.response) {
      const status = error.response.status;
      const serverData = error.response.data as any;
      message = serverData?.message || ERROR_MESSAGES[status] || message;
      console.error(`❌ [Captain API] ${status} ${error.config?.url}`, serverData);
      if (status === 401) {
        console.warn('🔐 [Captain API] 401 — logging out');
        useAuthStore.getState().logout();
      }
    } else if (error.request) {
      message = 'Network error. Is the backend running?';
      console.error('❌ [Captain API] No response:', error.message);
    }
    return Promise.reject(new Error(message));
  },
);
