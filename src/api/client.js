import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { refreshToken } from './tokenUtils';

// Change this to your backend URL
const BASE_URL = 'http://192.168.8.161:5000/api'; // Replace with your computer's IP

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshResult = await refreshToken();
        if (refreshResult.access_token) {
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResult.access_token}`;
          return client(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, clear tokens and let the error propagate
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export default client;

// Helper function to get full URL for uploaded images
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // Convert all backslashes to forward slashes
  let cleanPath = imagePath.replace(/\\/g, '/').replace(/\\/g, '/').replace(/\//g, '/');

  // If it's already a full URL, return as is
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // If it's a local file URI (from device gallery), we can't serve it
  if (cleanPath.startsWith('file://')) {
    return null;
  }

  // Remove leading 'uploads/' if present
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.substring('uploads/'.length);
  }

  // Construct the full URL
  const backendUrl = BASE_URL.replace('/api', '');
  return `${backendUrl}/uploads/${cleanPath}`;
};