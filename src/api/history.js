import client from './client';

export const historyAPI = {
  async getUserHistory(page = 1, perPage = 10) {
    try {
      const response = await client.get('/history/', {
        params: { page, per_page: perPage },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async getUserAnalyses(filters = {}) {
    try {
      const response = await client.get('/history/analyses', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async getUserStatistics() {
    try {
      const response = await client.get('/history/statistics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async generateCertificate(analysisId) {
    try {
      const response = await client.post(`/certificate/generate/${analysisId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async downloadCertificate(analysisId) {
    try {
      const response = await client.get(`/certificate/download/${analysisId}`, {
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async clearUserHistory() {
    try {
      const response = await client.delete('/history/clear');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};