import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

export default function USBCameraView({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('checking');

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to use the USB microscope',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(hasPermission);
        setCameraStatus(hasPermission ? 'ready' : 'permission_denied');
        
        if (hasPermission) {
          detectUSBCameras();
        }
      }
    } catch (error) {
      console.log('Error requesting camera permission:', error);
      setCameraStatus('error');
    }
  };

  const detectUSBCameras = async () => {
    // For now, we'll use a native module call simulation
    // In a real implementation, this would call a native module
    console.log('🔍 Detecting USB cameras...');
    setCameraStatus('detecting');
    
    // Simulate detection
    setTimeout(() => {
      setCameraStatus('ready');
    }, 1000);
  };

  const openNativeCamera = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is needed to access the USB microscope.');
      return;
    }

    setIsCapturing(true);
    
    try {
      // For Android with USB OTG microscope, we need to use a different approach
      // This will open the camera with a preference for external cameras
      Alert.alert(
        'USB Microscope Access',
        'To access your USB microscope:\n\n1. Ensure USB microscope is connected via OTG\n2. Open your device\'s Camera app\n3. Look for camera switch option (usually has multiple camera icons)\n4. Switch to USB/External camera\n5. Take photo and return to app\n\nWould you like to open the Camera app now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Camera App', 
            onPress: openSystemCamera
          }
        ]
      );
    } catch (error) {
      console.error('Error accessing camera:', error);
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const openSystemCamera = () => {
    // This would ideally open the system camera app
    // For now, we'll show instructions
    Alert.alert(
      'System Camera Instructions',
      'Manual steps for USB microscope:\n\n1. Close this app\n2. Open your device\'s Camera app\n3. Connect USB microscope via OTG\n4. In Camera app, tap the camera switch button\n5. Select USB/External camera option\n6. Capture image\n7. Return to this app and use Gallery option to select the image',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const testUSBConnection = () => {
    Alert.alert(
      'USB Microscope Test',
      'Testing USB microscope connection...\n\nTo test your USB microscope:\n\n1. Connect via OTG cable\n2. Check if a notification appears about USB device\n3. Try opening your device\'s Camera app\n4. Look for camera switching options\n\nUSB microscopes typically appear as external camera sources in Android.',
      [
        { text: 'Test Connection', onPress: detectUSBCameras },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const renderCameraInterface = () => {
    return (
      <View style={styles.cameraInterface}>
        <View style={styles.microscopeDisplay}>
          <Icon name="camera-alt" size={48} color={colors.primary} />
          <Text style={styles.microscopeTitle}>USB Digital Microscope</Text>
          
          <View style={styles.statusIndicator}>
            <Icon 
              name={cameraStatus === 'ready' ? 'check-circle' : 
                    cameraStatus === 'detecting' ? 'sync' : 
                    cameraStatus === 'permission_denied' ? 'block' : 'error'} 
              size={16} 
              color={cameraStatus === 'ready' ? colors.success : 
                     cameraStatus === 'detecting' ? colors.warning : colors.error} 
            />
            <Text style={styles.statusText}>
              {cameraStatus === 'ready' ? 'Ready' :
               cameraStatus === 'detecting' ? 'Detecting...' :
               cameraStatus === 'permission_denied' ? 'Permission Denied' :
               cameraStatus === 'checking' ? 'Checking...' : 'Error'}
            </Text>
          </View>

          <Text style={styles.instructionText}>
            Connect your USB microscope via OTG cable to access external camera feed
          </Text>
        </View>
      </View>
    );
  };

  const renderControls = () => {
    return (
      <View style={styles.controls}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cameraButton]}
            onPress={openNativeCamera}
            disabled={isCapturing}
          >
            <Icon name="videocam" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {isCapturing ? 'Opening...' : '🔬 USB Camera'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.testButton]}
            onPress={testUSBConnection}
          >
            <Icon name="usb" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>🔍 Test USB</Text>
          </TouchableOpacity>
        </View>

        {!hasPermission && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.permissionButton]}
            onPress={checkCameraPermission}
          >
            <Icon name="security" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 USB Microscope Setup:</Text>
          <Text style={styles.infoItem}>• Connect microscope to USB OTG cable</Text>
          <Text style={styles.infoItem}>• Connect OTG cable to phone</Text>
          <Text style={styles.infoItem}>• Android should detect USB camera device</Text>
          <Text style={styles.infoItem}>• Use system camera app to access microscope</Text>
          <Text style={styles.infoItem}>• Switch to external/USB camera in camera app</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewfinder}>
        {renderCameraInterface()}
      </View>
      {renderControls()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  viewfinder: {
    height: 300,
    backgroundColor: '#000000',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cameraInterface: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  microscopeDisplay: {
    alignItems: 'center',
    padding: 20,
  },
  microscopeTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 16,
  },
  controls: {
    marginTop: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
  },
  cameraButton: {
    backgroundColor: colors.primary,
  },
  testButton: {
    backgroundColor: colors.secondary,
  },
  permissionButton: {
    backgroundColor: colors.warning,
    marginTop: 10,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginHorizontal: 5,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
});