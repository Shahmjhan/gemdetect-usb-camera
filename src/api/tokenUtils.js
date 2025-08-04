import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http:///192.168.8.161:5000/api';

export const refreshToken = async () => {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });
    
    if (response.data.access_token) {
      await SecureStore.setItemAsync('access_token', response.data.access_token);
      return response.data;
    } else {
      throw new Error('No access token received from refresh');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear tokens if refresh fails
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    throw error.response?.data || error;
  }
}; 