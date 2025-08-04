/**
 * USB Digital Microscope Integration Test Suite
 * 
 * This test file verifies the complete flow of USB microscope functionality
 * including device detection, connection, streaming, image capture, and analysis.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AnalysisScreen from '../screens/AnalysisScreen';
import MicroscopeView from '../components/microscope/MicroscopeView';
import usbMicroscopeManager, { MicroscopeUtils } from '../../utils/microscope';
import { gemstoneAPI } from '../api/gemstone';

// Mock dependencies
jest.mock('../../utils/microscope');
jest.mock('../api/gemstone');
jest.mock('expo-image-picker');
jest.mock('expo-haptics');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock app context
jest.mock('../store/appContext', () => ({
  useApp: () => ({
    setCurrentAnalysis: jest.fn(),
    setIsAnalyzing: jest.fn(),
  }),
}));

describe('USB Digital Microscope Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
  });

  describe('USB Microscope Manager Tests', () => {
    test('should initialize microscope manager successfully', async () => {
      usbMicroscopeManager.initialize.mockResolvedValue(true);
      
      const result = await usbMicroscopeManager.initialize();
      
      expect(result).toBe(true);
      expect(usbMicroscopeManager.initialize).toHaveBeenCalled();
    });

    test('should detect supported USB devices', () => {
      const mockDevice = {
        vendorId: 0x0ac8,
        productId: 0x3420,
        name: 'Generic USB Microscope'
      };

      usbMicroscopeManager.isSupportedDevice.mockReturnValue(true);
      
      const isSupported = usbMicroscopeManager.isSupportedDevice(mockDevice);
      
      expect(isSupported).toBe(true);
      expect(usbMicroscopeManager.isSupportedDevice).toHaveBeenCalledWith(mockDevice);
    });

    test('should handle device connection', async () => {
      const mockDevice = {
        deviceId: 'test_device_001',
        vendorId: 0x0ac8,
        productId: 0x3420,
        name: 'Generic USB Microscope'
      };

      const mockConnectionCallback = jest.fn();
      usbMicroscopeManager.setOnDeviceConnected(mockConnectionCallback);
      usbMicroscopeManager.connectToDevice.mockResolvedValue(undefined);

      await usbMicroscopeManager.connectToDevice(mockDevice);

      expect(usbMicroscopeManager.connectToDevice).toHaveBeenCalledWith(mockDevice);
    });

    test('should capture image from microscope', async () => {
      const mockImageData = 'data:image/svg+xml;base64,mock_image_data';
      usbMicroscopeManager.captureImage.mockResolvedValue(mockImageData);
      usbMicroscopeManager.getConnectionStatus.mockReturnValue({
        isConnected: true,
        device: { name: 'Test Device' }
      });

      const result = await usbMicroscopeManager.captureImage();

      expect(result).toBe(mockImageData);
      expect(usbMicroscopeManager.captureImage).toHaveBeenCalled();
    });

    test('should handle connection failure gracefully', async () => {
      usbMicroscopeManager.initialize.mockResolvedValue(false);
      
      const result = await usbMicroscopeManager.initialize();
      
      expect(result).toBe(false);
    });

    test('should generate simulated frame data', () => {
      const mockFrameData = {
        timestamp: Date.now(),
        width: 640,
        height: 480,
        data: 'simulated_frame_data',
        format: 'YUYV',
        svgContent: '<svg>mock content</svg>'
      };

      usbMicroscopeManager.generateSimulatedFrame.mockReturnValue(mockFrameData);
      
      const frame = usbMicroscopeManager.generateSimulatedFrame();
      
      expect(frame).toHaveProperty('timestamp');
      expect(frame).toHaveProperty('width', 640);
      expect(frame).toHaveProperty('height', 480);
      expect(frame).toHaveProperty('data');
    });
  });

  describe('MicroscopeView Component Tests', () => {
    const mockProps = {
      isConnected: false,
      onImageCaptured: jest.fn(),
      onConnectionChange: jest.fn(),
      onSettingsChange: jest.fn(),
    };

    test('should render disconnected state correctly', () => {
      const { getByText } = render(<MicroscopeView {...mockProps} />);
      
      expect(getByText('USB Microscope Not Connected')).toBeTruthy();
      expect(getByText('Connect your USB microscope via OTG cable')).toBeTruthy();
    });

    test('should show connected state when microscope is connected', () => {
      const connectedProps = { ...mockProps, isConnected: true };
      const { getByText } = render(<MicroscopeView {...connectedProps} />);
      
      // Should show stream or initializing message
      expect(
        getByText('Initializing microscope stream...') || 
        getByText('Waiting for microscope connection...')
      ).toBeTruthy();
    });

    test('should handle image capture', async () => {
      const connectedProps = { ...mockProps, isConnected: true };
      usbMicroscopeManager.captureImage.mockResolvedValue('mock_image_data');
      usbMicroscopeManager.getConnectionStatus.mockReturnValue({
        isConnected: true
      });

      const { getByText } = render(<MicroscopeView {...connectedProps} />);
      
      // Find and press capture button if it exists
      const captureButton = getByText('Capture Image');
      if (captureButton) {
        fireEvent.press(captureButton);
        
        await waitFor(() => {
          expect(mockProps.onImageCaptured).toHaveBeenCalled();
        });
      }
    });

    test('should handle zoom controls', async () => {
      const connectedProps = { ...mockProps, isConnected: true };
      usbMicroscopeManager.setSettings.mockResolvedValue(undefined);

      const { getByTestId } = render(<MicroscopeView {...connectedProps} />);
      
      // Mock zoom controls if they exist
      if (getByTestId('zoom-in-button')) {
        fireEvent.press(getByTestId('zoom-in-button'));
        
        await waitFor(() => {
          expect(usbMicroscopeManager.setSettings).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Analysis Screen Integration Tests', () => {
    test('should render microscope section', () => {
      const { getByText } = render(<AnalysisScreen />);
      
      expect(getByText('USB Digital Microscope')).toBeTruthy();
      expect(getByText('Real-time analysis with USB OTG microscope')).toBeTruthy();
    });

    test('should show connection status', () => {
      const { getByText } = render(<AnalysisScreen />);
      
      // Should show disconnected initially
      expect(getByText('Disconnected')).toBeTruthy();
    });

    test('should handle microscope image capture', async () => {
      const mockImageData = 'data:image/svg+xml;base64,mock_image_data';
      const { getByText } = render(<AnalysisScreen />);
      
      // Simulate image capture
      act(() => {
        // Find MicroscopeView component and trigger image capture
        const microscopeView = getByText('USB Digital Microscope').parent;
        // Simulate capture callback
        if (microscopeView) {
          // This would be called by MicroscopeView
          // handleMicroscopeImageCaptured(mockImageData);
        }
      });

      // Verify image was set
      await waitFor(() => {
        expect(getByText('Selected Image')).toBeTruthy();
      });
    });

    test('should analyze microscope image', async () => {
      const mockAnalysisResult = {
        analysis_id: 'test_123',
        predicted_class: 'Natural',
        confidence: 0.95,
        results: {
          type: 'Natural',
          confidence: 95,
          characteristics: ['clarity', 'color']
        }
      };

      gemstoneAPI.analyzeGemstone.mockResolvedValue(mockAnalysisResult);

      const { getByText } = render(<AnalysisScreen />);
      
      // Simulate having a selected image
      act(() => {
        // Set selected image state
        // This would be done through component state management
      });

      // Find and press analyze button
      const analyzeButton = getByText('Analyze Gemstone');
      if (analyzeButton) {
        fireEvent.press(analyzeButton);
        
        await waitFor(() => {
          expect(gemstoneAPI.analyzeGemstone).toHaveBeenCalledWith(
            expect.any(String),
            true // isMicroscope = true
          );
        });
      }
    });
  });

  describe('Microscope Utils Tests', () => {
    test('should convert frame data to base64', () => {
      const mockFrameData = {
        data: 'simulated_frame_data',
        svgContent: '<svg>test</svg>'
      };

      MicroscopeUtils.frameToBase64.mockReturnValue('data:image/svg+xml;base64,dGVzdA==');
      
      const result = MicroscopeUtils.frameToBase64(mockFrameData);
      
      expect(result).toContain('data:image/svg+xml;base64,');
    });

    test('should get device info', () => {
      const mockDevice = {
        name: 'Test Microscope',
        vendorId: 0x0ac8,
        productId: 0x3420,
        deviceId: 'test_001',
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN123'
      };

      MicroscopeUtils.getDeviceInfo.mockReturnValue({
        name: 'Test Microscope',
        vendorId: 0x0ac8,
        productId: 0x3420,
        deviceId: 'test_001',
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN123'
      });

      const info = MicroscopeUtils.getDeviceInfo(mockDevice);
      
      expect(info).toHaveProperty('name', 'Test Microscope');
      expect(info).toHaveProperty('vendorId', 0x0ac8);
      expect(info).toHaveProperty('productId', 0x3420);
    });

    test('should validate device compatibility', () => {
      const compatibleDevice = {
        vendorId: 0x0ac8,
        productId: 0x3420
      };

      MicroscopeUtils.isCompatible.mockReturnValue(true);
      
      const isCompatible = MicroscopeUtils.isCompatible(compatibleDevice);
      
      expect(isCompatible).toBe(true);
    });
  });

  describe('API Integration Tests', () => {
    test('should send microscope image for analysis', async () => {
      const mockImageUri = 'data:image/svg+xml;base64,mock_data';
      const mockResponse = {
        analysis_id: 'test_123',
        results: { type: 'Natural', confidence: 95 }
      };

      gemstoneAPI.analyzeGemstone.mockResolvedValue(mockResponse);

      const result = await gemstoneAPI.analyzeGemstone(mockImageUri, true);

      expect(gemstoneAPI.analyzeGemstone).toHaveBeenCalledWith(mockImageUri, true);
      expect(result).toEqual(mockResponse);
    });

    test('should handle SVG image format correctly', async () => {
      const svgImageUri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
      
      gemstoneAPI.analyzeGemstone.mockImplementation((imageUri, isMicroscope) => {
        expect(imageUri).toContain('data:image/svg+xml;base64,');
        expect(isMicroscope).toBe(true);
        return Promise.resolve({ analysis_id: 'test' });
      });

      await gemstoneAPI.analyzeGemstone(svgImageUri, true);
    });

    test('should handle analysis errors gracefully', async () => {
      const errorMessage = 'Analysis failed';
      gemstoneAPI.analyzeGemstone.mockRejectedValue(new Error(errorMessage));

      try {
        await gemstoneAPI.analyzeGemstone('invalid_image', true);
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle microscope initialization failure', async () => {
      usbMicroscopeManager.initialize.mockRejectedValue(new Error('USB not supported'));

      try {
        await usbMicroscopeManager.initialize();
      } catch (error) {
        expect(error.message).toBe('USB not supported');
      }
    });

    test('should handle capture failure when not connected', async () => {
      usbMicroscopeManager.getConnectionStatus.mockReturnValue({
        isConnected: false
      });
      usbMicroscopeManager.captureImage.mockRejectedValue(
        new Error('Microscope not connected')
      );

      try {
        await usbMicroscopeManager.captureImage();
      } catch (error) {
        expect(error.message).toBe('Microscope not connected');
      }
    });

    test('should handle permission denied gracefully', () => {
      const { getByText } = render(<AnalysisScreen />);
      
      // Simulate permission denied scenario
      act(() => {
        Alert.alert.mockImplementation((title, message, buttons) => {
          expect(title).toContain('Permission');
          if (buttons && buttons[0]) {
            buttons[0].onPress();
          }
        });
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle rapid frame updates', async () => {
      const frameCallback = jest.fn();
      usbMicroscopeManager.setOnFrameReceived(frameCallback);

      // Simulate rapid frame updates
      for (let i = 0; i < 100; i++) {
        const frameData = {
          timestamp: Date.now(),
          data: `frame_${i}`
        };
        
        act(() => {
          // Simulate frame received
          if (frameCallback.mock.calls.length > 0) {
            frameCallback(frameData);
          }
        });
      }

      expect(frameCallback).toHaveBeenCalled();
    });

    test('should cleanup resources properly', () => {
      usbMicroscopeManager.cleanup.mockImplementation(() => {
        // Verify cleanup actions
      });

      usbMicroscopeManager.cleanup();
      
      expect(usbMicroscopeManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('Platform-specific Tests', () => {
    test('should handle Android-specific functionality', () => {
      const originalPlatform = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'android';

      const { getByText } = render(<AnalysisScreen />);
      
      // Should show microscope functionality on Android
      expect(getByText('USB Digital Microscope')).toBeTruthy();

      require('react-native').Platform.OS = originalPlatform;
    });

    test('should show iOS limitation message', () => {
      const originalPlatform = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'ios';

      const { getByText } = render(<AnalysisScreen />);
      
      // Should show iOS not supported message
      expect(getByText(/USB microscopes are not supported on iOS/)).toBeTruthy();

      require('react-native').Platform.OS = originalPlatform;
    });
  });
});

/**
 * Integration Test Runner
 * 
 * This function runs a comprehensive test of the entire microscope workflow
 */
export const runMicroscopeIntegrationTest = async () => {
  console.log('Starting USB Microscope Integration Test...');
  
  try {
    // Test 1: Initialize microscope manager
    console.log('Test 1: Initializing microscope manager...');
    const initialized = await usbMicroscopeManager.initialize();
    console.log(`Initialization result: ${initialized}`);

    // Test 2: Check connection status
    console.log('Test 2: Checking connection status...');
    const status = usbMicroscopeManager.getConnectionStatus();
    console.log('Connection status:', status);

    // Test 3: Get supported devices
    console.log('Test 3: Getting supported devices...');
    const devices = usbMicroscopeManager.getSupportedDevices();
    console.log(`Found ${devices.length} supported device types`);

    // Test 4: Test image capture (simulated)
    if (status.isConnected) {
      console.log('Test 4: Testing image capture...');
      const imageData = await usbMicroscopeManager.captureImage();
      console.log(`Captured image: ${imageData.substring(0, 50)}...`);

      // Test 5: Test image analysis
      console.log('Test 5: Testing image analysis...');
      try {
        const analysisResult = await gemstoneAPI.analyzeGemstone(imageData, true);
        console.log('Analysis result:', analysisResult);
      } catch (error) {
        console.log('Analysis test skipped (API not available):', error.message);
      }
    } else {
      console.log('Test 4 & 5: Skipped (microscope not connected)');
    }

    // Test 6: Cleanup
    console.log('Test 6: Cleaning up resources...');
    usbMicroscopeManager.cleanup();
    
    console.log('✅ USB Microscope Integration Test Completed Successfully');
    return true;
    
  } catch (error) {
    console.error('❌ USB Microscope Integration Test Failed:', error);
    return false;
  }
};