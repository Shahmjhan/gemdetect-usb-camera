import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/theme';
import usbMicroscopeManager, { MicroscopeUtils } from '../../../utils/microscope';

export default function USBMicroscopeTest() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [supportedDevices, setSupportedDevices] = useState([]);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    initializeTest();
    return () => {
      usbMicroscopeManager.cleanup();
    };
  }, []);

  const initializeTest = async () => {
    try {
      // Set up event listeners
      usbMicroscopeManager.setOnDeviceConnected(handleDeviceConnected);
      usbMicroscopeManager.setOnDeviceDisconnected(handleDeviceDisconnected);
      usbMicroscopeManager.setOnFrameReceived(handleFrameReceived);

      // Get supported devices
      const devices = usbMicroscopeManager.getSupportedDevices();
      setSupportedDevices(devices);

      // Initialize microscope manager
      const initialized = await usbMicroscopeManager.initialize();
      addTestResult('Initialization', initialized ? 'SUCCESS' : 'FAILED', initialized ? 'Microscope manager initialized' : 'Failed to initialize microscope manager');

      if (initialized) {
        // Check current connection status
        const status = usbMicroscopeManager.getConnectionStatus();
        setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
        addTestResult('Connection Status', status.isConnected ? 'CONNECTED' : 'DISCONNECTED', status.isConnected ? 'Device is connected' : 'No device connected');
      }
    } catch (error) {
      addTestResult('Initialization Error', 'ERROR', error.message);
    }
  };

  const handleDeviceConnected = (device) => {
    console.log('Device connected in test:', device);
    setConnectionStatus('connected');
    setDeviceInfo(MicroscopeUtils.getDeviceInfo(device));
    addTestResult('Device Connected', 'SUCCESS', `Connected to ${device.name || 'USB Microscope'}`);
  };

  const handleDeviceDisconnected = () => {
    console.log('Device disconnected in test');
    setConnectionStatus('disconnected');
    setDeviceInfo(null);
    addTestResult('Device Disconnected', 'WARNING', 'USB microscope disconnected');
  };

  const handleFrameReceived = (frameData) => {
    console.log('Frame received in test:', frameData);
    addTestResult('Frame Received', 'SUCCESS', 'Video frame received from microscope');
  };

  const addTestResult = (test, status, message) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runConnectionTest = async () => {
    try {
      addTestResult('Manual Connection Test', 'RUNNING', 'Attempting to connect to microscope...');
      
      const connected = await usbMicroscopeManager.manualConnect();
      
      if (connected) {
        addTestResult('Manual Connection Test', 'SUCCESS', 'Successfully connected to microscope');
      } else {
        addTestResult('Manual Connection Test', 'FAILED', 'No compatible microscope found');
      }
    } catch (error) {
      addTestResult('Manual Connection Test', 'ERROR', error.message);
    }
  };

  const runSettingsTest = async () => {
    try {
      if (!usbMicroscopeManager.getConnectionStatus().isConnected) {
        addTestResult('Settings Test', 'SKIPPED', 'No device connected');
        return;
      }

      addTestResult('Settings Test', 'RUNNING', 'Testing microscope settings...');
      
      // Test setting brightness
      await usbMicroscopeManager.setSettings({ brightness: 75 });
      addTestResult('Brightness Setting', 'SUCCESS', 'Brightness set to 75%');

      // Test getting settings
      const settings = await usbMicroscopeManager.getSettings();
      addTestResult('Get Settings', 'SUCCESS', `Current settings: ${JSON.stringify(settings)}`);

    } catch (error) {
      addTestResult('Settings Test', 'ERROR', error.message);
    }
  };

  const runCaptureTest = async () => {
    try {
      if (!usbMicroscopeManager.getConnectionStatus().isConnected) {
        addTestResult('Capture Test', 'SKIPPED', 'No device connected');
        return;
      }

      addTestResult('Capture Test', 'RUNNING', 'Testing image capture...');
      
      const imageData = await usbMicroscopeManager.captureImage();
      addTestResult('Image Capture', 'SUCCESS', `Captured image: ${imageData.substring(0, 50)}...`);

    } catch (error) {
      addTestResult('Capture Test', 'ERROR', error.message);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return colors.success;
      case 'FAILED': return colors.error;
      case 'ERROR': return colors.error;
      case 'WARNING': return colors.warning;
      case 'RUNNING': return colors.primary;
      case 'SKIPPED': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="usb" size={24} color={colors.primary} />
        <Text style={styles.title}>USB Microscope Test</Text>
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={[styles.statusIndicator, { backgroundColor: connectionStatus === 'connected' ? colors.success : colors.error }]}>
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      </View>

      {deviceInfo && (
        <View style={styles.deviceSection}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{deviceInfo.name}</Text>
            <Text style={styles.deviceDetails}>Vendor ID: {deviceInfo.vendorId}</Text>
            <Text style={styles.deviceDetails}>Product ID: {deviceInfo.productId}</Text>
            <Text style={styles.deviceDetails}>Manufacturer: {deviceInfo.manufacturer}</Text>
          </View>
        </View>
      )}

      <View style={styles.supportedSection}>
        <Text style={styles.sectionTitle}>Supported Devices</Text>
        {supportedDevices.map((device, index) => (
          <View key={index} style={styles.supportedDevice}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceDetails}>VID: 0x{device.vendorId.toString(16).toUpperCase()}, PID: 0x{device.productId.toString(16).toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Test Controls</Text>
        <View style={styles.testButtons}>
          <TouchableOpacity style={styles.testButton} onPress={runConnectionTest}>
            <Icon name="usb" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={runSettingsTest}>
            <Icon name="settings" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Test Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={runCaptureTest}>
            <Icon name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Test Capture</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.testButton, { backgroundColor: colors.error }]} onPress={clearTestResults}>
            <Icon name="clear" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        {testResults.map((result) => (
          <View key={result.id} style={styles.testResult}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTest}>{result.test}</Text>
              <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                {result.status}
              </Text>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>
            <Text style={styles.resultTimestamp}>{result.timestamp}</Text>
          </View>
        ))}
        {testResults.length === 0 && (
          <Text style={styles.noResults}>No test results yet. Run some tests to see results.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  statusSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  statusIndicator: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceSection: {
    padding: 20,
  },
  deviceInfo: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  deviceDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  supportedSection: {
    padding: 20,
  },
  supportedDevice: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testSection: {
    padding: 20,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  testButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: '48%',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  resultsSection: {
    padding: 20,
  },
  testResult: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultTest: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  resultTimestamp: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  noResults: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
}); 