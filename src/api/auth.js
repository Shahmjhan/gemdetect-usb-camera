import client from './client';
import * as SecureStore from 'expo-secure-store';
import { refreshToken as refreshTokenUtil } from './tokenUtils';

export const authAPI = {
  async register(username, email, password) {
    try {
      const response = await client.post('/auth/register', {
        username,
        email,
        password,
      });
      
      if (response.data.access_token) {
        await SecureStore.setItemAsync('access_token', response.data.access_token);
        await SecureStore.setItemAsync('refresh_token', response.data.refresh_token);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async login(username, password) {
    try {
      const response = await client.post('/auth/login', {
        username,
        password,
      });
      
      if (response.data.access_token) {
        await SecureStore.setItemAsync('access_token', response.data.access_token);
        await SecureStore.setItemAsync('refresh_token', response.data.refresh_token);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async logout() {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },

  async getProfile() {
    try {
      const response = await client.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async refreshToken() {
    return await refreshTokenUtil();
  },

  async updateProfile(profileData) {
    try {
      const response = await client.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await client.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async uploadProfileImage(imageUri) {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile_image.jpg',
      });

      const response = await client.post('/auth/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};