import client from './client';

export const gemstoneAPI = {
  async analyzeGemstone(imageUri, isMicroscope = false) {
    try {
      const formData = new FormData();
      
      // Handle SVG images from microscope
      if (isMicroscope && imageUri.startsWith('data:image/svg+xml;base64,')) {
        // For microscope SVG images, we need to convert them to a format the backend can handle
        // Since we can't easily convert SVG to JPEG in React Native, we'll send the SVG data
        // and let the backend handle the conversion
        formData.append('image', {
          uri: imageUri,
          type: 'image/svg+xml',
          name: 'microscope_image.svg',
        });
      } else {
        // Regular JPEG/PNG images
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'gemstone.jpg',
        });
      }
      
      formData.append('is_microscope', isMicroscope.toString());

      const response = await client.post('/gemstone/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Analysis error:', error);
      throw error.response?.data || error;
    }
  },

  async getAnalysis(analysisId) {
    try {
      const response = await client.get(`/gemstone/analyze/${analysisId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async checkModelHealth() {
    try {
      const response = await client.get('/gemstone/health');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};